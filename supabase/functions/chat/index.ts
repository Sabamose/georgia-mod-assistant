import { buildSystemPrompt } from "./prompt.ts";
import { buildGuidanceMetadata } from "./guidance.ts";
import { streamAnthropicChat } from "./providers/anthropic.ts";
import { streamOpenAIChat } from "./providers/openai.ts";
import {
  isProviderName,
  ProviderError,
  type ChatLanguage,
  type ChatMessage,
  type ChatProviderName,
} from "./providers/types.ts";
import { createAnthropicCompatibleStream } from "./stream-normalizer.ts";

const VALID_ROLES = new Set(["user", "assistant"]);
const VALID_LANGUAGES = new Set(["en", "ka"]);
const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_MESSAGES = 24;
const MAX_TOTAL_MESSAGE_CHARS = 12_000;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 12;
const INVALID_JSON_ERROR_MESSAGE = "Invalid JSON body";
const DEFAULT_ALLOWED_ORIGINS = [
  "https://georgia-mod-assistant.vercel.app",
  "http://localhost:5173",
  "http://localhost:5180",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5180",
  "http://127.0.0.1:4173",
];
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function getAllowedOrigins(): string[] {
  const envValue = Deno.env.get("ALLOWED_ORIGINS")?.trim();
  if (!envValue) return DEFAULT_ALLOWED_ORIGINS;

  const origins = envValue
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : DEFAULT_ALLOWED_ORIGINS;
}

function getCorsHeaders(req?: Request, allowedOrigin?: string | null) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };

  if (req?.headers.get("origin") && allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = allowedOrigin;
  }

  return headers;
}

function resolveAllowedOrigin(req?: Request): string | null {
  const origin = req?.headers.get("origin")?.trim();
  if (!origin) return null;
  return getAllowedOrigins().includes(origin) ? origin : null;
}

function jsonResponse(
  cors: Record<string, string>,
  status: number,
  payload: unknown,
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json",
    },
  });
}

function logEvent(payload: Record<string, unknown>) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    ...payload,
  }));
}

function getNumericEnv(name: string, fallback: number): number {
  const rawValue = Deno.env.get(name)?.trim();
  if (!rawValue) return fallback;

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function sanitizeMessages(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages)) return [];

  const sanitized: ChatMessage[] = [];
  for (const message of messages) {
    if (!message || typeof message !== "object") continue;
    const candidate = message as Record<string, unknown>;
    if (!VALID_ROLES.has(String(candidate.role))) continue;
    if (typeof candidate.content !== "string") continue;

    sanitized.push({
      role: candidate.role as ChatMessage["role"],
      content: candidate.content.slice(0, MAX_MESSAGE_LENGTH),
    });
  }

  return sanitized;
}

function mergeMessages(messages: ChatMessage[]): ChatMessage[] {
  let trimmed = messages.slice(-MAX_HISTORY_MESSAGES);

  while (trimmed.length > 0 && trimmed[0].role === "assistant") {
    trimmed = trimmed.slice(1);
  }

  const merged: ChatMessage[] = [];
  for (const message of trimmed) {
    if (merged.length > 0 && merged[merged.length - 1].role === message.role) {
      merged[merged.length - 1].content = `${merged[merged.length - 1].content}\n${message.content}`
        .slice(-MAX_MESSAGE_LENGTH);
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

function getClientIdentifier(req: Request): string | null {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const headerKeys = ["cf-connecting-ip", "x-real-ip", "fly-client-ip"];
  for (const headerKey of headerKeys) {
    const value = req.headers.get(headerKey)?.trim();
    if (value) return value;
  }

  return null;
}

function consumeRateLimit(req: Request) {
  const clientId = getClientIdentifier(req);
  if (!clientId) {
    return { allowed: true, remaining: null, retryAfterSeconds: null };
  }

  const now = Date.now();
  for (const [bucketKey, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(bucketKey);
    }
  }

  const windowMs = getNumericEnv("CHAT_RATE_LIMIT_WINDOW_MS", DEFAULT_RATE_LIMIT_WINDOW_MS);
  const maxRequests = getNumericEnv("CHAT_RATE_LIMIT_MAX_REQUESTS", DEFAULT_RATE_LIMIT_MAX_REQUESTS);
  const existing = rateLimitBuckets.get(clientId);

  if (!existing || existing.resetAt <= now) {
    rateLimitBuckets.set(clientId, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - existing.count),
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

function jsonRequestError() {
  return new Error(INVALID_JSON_ERROR_MESSAGE);
}

function getProvider(name: ChatProviderName) {
  return name === "openai" ? streamOpenAIChat : streamAnthropicChat;
}

function getConfiguredProvider(
  envName: string,
  defaultValue: ChatProviderName,
): ChatProviderName {
  const value = Deno.env.get(envName)?.trim();
  return isProviderName(value) ? value : defaultValue;
}

function shouldFallback(
  error: unknown,
  primary: ChatProviderName,
  fallback: ChatProviderName | null,
): boolean {
  if (!fallback || fallback === primary) return false;
  if (!(error instanceof ProviderError)) return false;
  return primary === "openai" || error.retryable;
}

Deno.serve(async (req: Request) => {
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const startedAt = Date.now();
  const allowedOrigin = resolveAllowedOrigin(req);
  const cors = getCorsHeaders(req, allowedOrigin);

  if (req.method === "OPTIONS") {
    if (req.headers.get("origin") && !allowedOrigin) {
      return jsonResponse(cors, 403, { error: "Origin not allowed" });
    }

    return new Response("ok", { headers: cors });
  }

  if (req.method !== "POST") {
    return jsonResponse(cors, 405, { error: "Method not allowed" });
  }

  if (req.headers.get("origin") && !allowedOrigin) {
    logEvent({
      event: "chat_request_blocked_origin",
      request_id: requestId,
      origin: req.headers.get("origin"),
      status_code: 403,
    });
    return jsonResponse(cors, 403, { error: "Origin not allowed", request_id: requestId });
  }

  const rateLimit = consumeRateLimit(req);
  if (!rateLimit.allowed) {
    logEvent({
      event: "chat_request_rate_limited",
      request_id: requestId,
      status_code: 429,
    });

    return new Response(JSON.stringify({
      error: "Too many requests",
      request_id: requestId,
    }), {
      status: 429,
      headers: {
        ...cors,
        "Content-Type": "application/json",
        "Retry-After": String(rateLimit.retryAfterSeconds ?? 60),
      },
    });
  }

  try {
    let body: { language?: string; messages?: unknown };
    try {
      body = await req.json();
    } catch {
      throw jsonRequestError();
    }

    const language = VALID_LANGUAGES.has(body.language) ? body.language : "en";
    const safeLang = language as ChatLanguage;
    const sanitizedMessages = sanitizeMessages(body.messages);
    const mergedMessages = mergeMessages(sanitizedMessages);

    if (mergedMessages.length === 0) {
      return jsonResponse(cors, 400, { error: "No messages provided" });
    }

    const systemPrompt = buildSystemPrompt(safeLang);
    const guidance = buildGuidanceMetadata(mergedMessages, safeLang);
    const primaryProvider = getConfiguredProvider("AI_PROVIDER", "openai");
    const fallbackProvider = getConfiguredProvider("AI_FALLBACK_PROVIDER", "anthropic");
    let activeProvider = primaryProvider;
    let fallbackUsed = false;

    let result;
    try {
      result = await getProvider(primaryProvider)({
        messages: mergedMessages,
        language: safeLang,
        systemPrompt,
        requestId,
      });
    } catch (error) {
      if (!shouldFallback(error, primaryProvider, fallbackProvider)) {
        throw error;
      }

      fallbackUsed = true;
      activeProvider = fallbackProvider as ChatProviderName;
      logEvent({
        event: "chat_provider_fallback",
        request_id: requestId,
        failed_provider: primaryProvider,
        fallback_provider: fallbackProvider,
        reason: error instanceof Error ? error.message : String(error),
      });

      result = await getProvider(activeProvider)({
        messages: mergedMessages,
        language: safeLang,
        systemPrompt,
        requestId,
      });
    }

    const latencyMs = Date.now() - startedAt;
    logEvent({
      event: "chat_request_accepted",
      request_id: requestId,
      provider: result.provider,
      model: result.model,
      latency_ms: latencyMs,
      fallback_used: fallbackUsed,
      status_code: 200,
    });

    const stream = createAnthropicCompatibleStream({
      requestId,
      model: result.model,
      textStream: result.textStream,
      messageStopPayload: {
        journey: guidance.journey,
        blocks: guidance.blocks,
      },
      onComplete: () => {
        logEvent({
          event: "chat_stream_complete",
          request_id: requestId,
          provider: result.provider,
          model: result.model,
          latency_ms: Date.now() - startedAt,
          fallback_used: fallbackUsed,
          status_code: 200,
        });
      },
      onError: (error) => {
        logEvent({
          event: "chat_stream_error",
          request_id: requestId,
          provider: activeProvider,
          model: result.model,
          latency_ms: Date.now() - startedAt,
          fallback_used: fallbackUsed,
          status_code: 500,
          error: error instanceof Error ? error.message : String(error),
        });
      },
    });

    return new Response(stream, {
      headers: {
        ...cors,
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    const invalidJson = error instanceof Error && error.message === INVALID_JSON_ERROR_MESSAGE;
    const statusCode = error instanceof ProviderError
      ? (error.statusCode && error.statusCode >= 400 ? 502 : 500)
      : invalidJson
      ? 400
      : 500;
    logEvent({
      event: "chat_request_error",
      request_id: requestId,
      provider: error instanceof ProviderError ? error.provider : undefined,
      model: error instanceof ProviderError ? error.model : undefined,
      latency_ms: Date.now() - startedAt,
      fallback_used: false,
      status_code: statusCode,
      error: error instanceof Error ? error.message : String(error),
      details: error instanceof ProviderError ? error.details : undefined,
    });

    return jsonResponse(cors, statusCode, {
      error: statusCode === 400
        ? "Invalid JSON body"
        : statusCode === 502
        ? "AI service error"
        : "Internal server error",
      request_id: requestId,
    });
  }
});
