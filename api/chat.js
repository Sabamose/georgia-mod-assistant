import { buildSystemPrompt } from "./_lib/prompt.js";
import {
  getEnvDiagnostics,
  getEnvValue,
  hasProviderKey,
  ProviderError,
  streamAnthropicChat,
  streamOpenAIChat,
} from "./_lib/providers.js";
import {
  buildAppointmentBlock,
  createMarkerSplitter,
  parseAppointmentPayload,
} from "./_lib/appointment.js";
import { buildAppointmentIntakeReply } from "./_lib/appointment-intake.js";
import { buildResponseBlocks } from "./_lib/response-blocks.js";

const VALID_ROLES = new Set(["user", "assistant"]);
const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_MESSAGES = 24;
const MAX_TOTAL_MESSAGE_CHARS = 12_000;
const MAX_BODY_BYTES = 256_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 12;

const rateLimitBuckets = new Map();

function logEvent(payload) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...payload }));
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  if (req.body !== undefined) {
    if (typeof req.body === "string") return JSON.parse(req.body);
    return req.body ?? {};
  }

  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY_BYTES) {
      throw Object.assign(new Error("Payload too large"), { statusCode: 413 });
    }
  }
  return raw ? JSON.parse(raw) : {};
}

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return [];

  const sanitized = [];
  for (const message of messages) {
    if (!message || typeof message !== "object") continue;
    if (!VALID_ROLES.has(String(message.role))) continue;
    if (typeof message.content !== "string") continue;

    sanitized.push({
      role: message.role,
      content: message.content.slice(0, MAX_MESSAGE_LENGTH),
    });
  }
  return sanitized;
}

function mergeMessages(messages) {
  let trimmed = messages.slice(-MAX_HISTORY_MESSAGES);

  while (trimmed.length > 0 && trimmed[0].role === "assistant") {
    trimmed = trimmed.slice(1);
  }

  const merged = [];
  for (const message of trimmed) {
    if (merged.length > 0 && merged[merged.length - 1].role === message.role) {
      merged[merged.length - 1].content =
        `${merged[merged.length - 1].content}\n${message.content}`.slice(-MAX_MESSAGE_LENGTH);
    } else {
      merged.push({ ...message });
    }
  }

  let totalChars = merged.reduce((sum, message) => sum + message.content.length, 0);
  while (merged.length > 1 && totalChars > MAX_TOTAL_MESSAGE_CHARS) {
    totalChars -= merged[0].content.length;
    merged.shift();
  }
  if (merged.length > 0 && merged[0].role === "assistant") {
    merged.shift();
  }
  if (merged.length > 0 && totalChars > MAX_TOTAL_MESSAGE_CHARS) {
    merged[0].content = merged[0].content.slice(-MAX_TOTAL_MESSAGE_CHARS);
  }
  return merged;
}

function getClientIdentifier(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || null;
}

function consumeRateLimit(req) {
  const clientId = getClientIdentifier(req);
  if (!clientId) return { allowed: true, retryAfterSeconds: null };

  const now = Date.now();
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }

  const existing = rateLimitBuckets.get(clientId);
  if (!existing || existing.resetAt <= now) {
    rateLimitBuckets.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterSeconds: null };
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: null };
}

function getConfiguredProvider(envName, defaultValue) {
  const value = getEnvValue(envName);
  return value === "openai" || value === "anthropic" ? value : defaultValue;
}

function getProvider(name) {
  return name === "openai" ? streamOpenAIChat : streamAnthropicChat;
}

function shouldFallback(error, primary, fallback) {
  if (!fallback || fallback === primary) return false;
  if (!hasProviderKey(fallback)) return false;
  if (!(error instanceof ProviderError)) return false;
  return primary === "openai" || error.retryable || error.missingKey;
}

function configMissingMessage(language) {
  return language === "ka"
    ? "დემო ჯერ არ არის სრულად კონფიგურირებული — სერვერზე აკლია მოდელის API გასაღები."
    : "This demo is not fully configured yet — the model API key is missing on the server.";
}

function streamErrorMessage(language) {
  return language === "ka"
    ? "ბოდიში, პასუხის მიღება ვერ მოხერხდა. გთხოვთ, სცადოთ კიდევ ერთხელ."
    : "Sorry, I could not get a response. Please try again.";
}

function writeSseEvent(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function writeTextDelta(res, text) {
  if (!text) return;
  writeSseEvent(res, {
    type: "content_block_delta",
    delta: { type: "text_delta", text },
  });
}

function beginSse(res) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  if (typeof res.flushHeaders === "function") res.flushHeaders();
}

function endWithMessage(res, language, text, { blocks = [], journey = null } = {}) {
  beginSse(res);
  writeTextDelta(res, text || streamErrorMessage(language));
  writeSseEvent(res, { type: "message_stop", journey, blocks });
  res.end();
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  let language = "en";

  try {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendJson(res, error?.statusCode === 413 ? 413 : 400, {
        error: "Invalid JSON body",
        request_id: requestId,
      });
      return;
    }

    language = body?.language === "ka" ? "ka" : "en";
    const messages = mergeMessages(sanitizeMessages(body?.messages));
    if (messages.length === 0) {
      sendJson(res, 400, { error: "No messages provided", request_id: requestId });
      return;
    }

    const rateLimit = consumeRateLimit(req);
    if (!rateLimit.allowed) {
      logEvent({ event: "chat_request_rate_limited", request_id: requestId, status_code: 429 });
      res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds ?? 60));
      sendJson(res, 429, { error: "Too many requests", request_id: requestId });
      return;
    }

    const appointmentIntakeReply = buildAppointmentIntakeReply(messages, language);
    if (appointmentIntakeReply) {
      logEvent({
        event: "chat_appointment_intake",
        request_id: requestId,
        journey: appointmentIntakeReply.journey,
      });
      endWithMessage(res, language, appointmentIntakeReply.text, {
        blocks: appointmentIntakeReply.blocks,
        journey: appointmentIntakeReply.journey,
      });
      return;
    }

    const primaryProvider = getConfiguredProvider("AI_PROVIDER", "openai");
    const fallbackProvider = getConfiguredProvider("AI_FALLBACK_PROVIDER", "anthropic");

    if (!hasProviderKey(primaryProvider) && !hasProviderKey(fallbackProvider)) {
      logEvent({
        event: "chat_config_missing",
        request_id: requestId,
        primary_provider: primaryProvider,
        fallback_provider: fallbackProvider,
        diagnostics: getEnvDiagnostics(),
      });
      endWithMessage(res, language, configMissingMessage(language));
      return;
    }

    const systemPrompt = buildSystemPrompt(language);
    let activeProvider = primaryProvider;
    let fallbackUsed = false;

    let result;
    try {
      result = await getProvider(primaryProvider)({ messages, systemPrompt });
    } catch (error) {
      if (!shouldFallback(error, primaryProvider, fallbackProvider)) throw error;

      fallbackUsed = true;
      activeProvider = fallbackProvider;
      logEvent({
        event: "chat_provider_fallback",
        request_id: requestId,
        failed_provider: primaryProvider,
        fallback_provider: fallbackProvider,
        reason: error instanceof Error ? error.message : String(error),
      });
      result = await getProvider(fallbackProvider)({ messages, systemPrompt });
    }

    logEvent({
      event: "chat_request_accepted",
      request_id: requestId,
      provider: result.provider,
      model: result.model,
      latency_ms: Date.now() - startedAt,
      fallback_used: fallbackUsed,
    });

    beginSse(res);
    const splitter = createMarkerSplitter();
    let emittedAnyText = false;
    let streamFailed = false;
    const assistantTextParts = [];

    try {
      for await (const chunk of result.textStream) {
        const visible = splitter.push(chunk);
        if (visible) {
          emittedAnyText = true;
          assistantTextParts.push(visible);
          writeTextDelta(res, visible);
        }
      }
    } catch (error) {
      streamFailed = true;
      logEvent({
        event: "chat_stream_error",
        request_id: requestId,
        provider: activeProvider,
        model: result.model,
        latency_ms: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
        details: error instanceof ProviderError ? error.details : undefined,
      });
    }

    const { text: tailText, payload } = splitter.flush();
    if (tailText) {
      emittedAnyText = true;
      assistantTextParts.push(tailText);
      writeTextDelta(res, tailText);
    }

    let blocks = [];
    if (!streamFailed && payload) {
      const appointment = buildAppointmentBlock(parseAppointmentPayload(payload), language);
      if (appointment) {
        blocks = [appointment];
        logEvent({
          event: "chat_appointment_booked",
          request_id: requestId,
          reference: appointment.reference,
        });
      } else {
        logEvent({ event: "chat_appointment_payload_invalid", request_id: requestId });
      }
    }

    if (streamFailed && !emittedAnyText) {
      writeTextDelta(res, streamErrorMessage(language));
    }

    if (!streamFailed) {
      blocks = buildResponseBlocks({
        messages,
        assistantText: assistantTextParts.join(""),
        language,
        existingBlocks: blocks,
      });
    }

    writeSseEvent(res, { type: "message_stop", journey: null, blocks });
    res.end();

    logEvent({
      event: "chat_stream_complete",
      request_id: requestId,
      provider: result.provider,
      model: result.model,
      latency_ms: Date.now() - startedAt,
      fallback_used: fallbackUsed,
      appointment: blocks.some((block) => block.type === "appointment_card"),
    });
  } catch (error) {
    const statusCode = error instanceof ProviderError ? 502 : 500;
    logEvent({
      event: "chat_request_error",
      request_id: requestId,
      provider: error instanceof ProviderError ? error.provider : undefined,
      latency_ms: Date.now() - startedAt,
      status_code: statusCode,
      error: error instanceof Error ? error.message : String(error),
      details: error instanceof ProviderError ? error.details : undefined,
    });

    if (res.headersSent) {
      writeTextDelta(res, streamErrorMessage(language));
      writeSseEvent(res, { type: "message_stop", journey: null, blocks: [] });
      res.end();
      return;
    }
    sendJson(res, statusCode, {
      error: statusCode === 502 ? "AI service error" : "Internal server error",
      request_id: requestId,
    });
  }
}
