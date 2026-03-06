import { buildSystemPrompt } from "./prompt.ts";
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
const DEFAULT_ALLOWED_ORIGINS = [
  "https://georgia-mod-assistant.vercel.app",
  "http://localhost:5173",
  "http://localhost:5180",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5180",
  "http://127.0.0.1:4173",
];

function getAllowedOrigins(): string[] {
  const envValue = Deno.env.get("ALLOWED_ORIGINS")?.trim();
  if (!envValue) return DEFAULT_ALLOWED_ORIGINS;

  const origins = envValue
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : DEFAULT_ALLOWED_ORIGINS;
}

function getCorsHeaders(req?: Request) {
  const allowedOrigins = getAllowedOrigins();
  const origin = req?.headers.get("origin") || "";
  const allowedOrigin = allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
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
  let trimmed = messages.slice(-40);

  while (trimmed.length > 0 && trimmed[0].role === "assistant") {
    trimmed = trimmed.slice(1);
  }

  const merged: ChatMessage[] = [];
  for (const message of trimmed) {
    if (merged.length > 0 && merged[merged.length - 1].role === message.role) {
      merged[merged.length - 1].content += `\n${message.content}`;
    } else {
      merged.push({ ...message });
    }
  }

  return merged;
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
  const cors = getCorsHeaders(req);
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const startedAt = Date.now();

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const body = await req.json();
    const language = VALID_LANGUAGES.has(body.language) ? body.language : "en";
    const safeLang = language as ChatLanguage;
    const sanitizedMessages = sanitizeMessages(body.messages);
    const mergedMessages = mergeMessages(sanitizedMessages);

    if (mergedMessages.length === 0) {
      return jsonResponse(cors, 400, { error: "No messages provided" });
    }

    const systemPrompt = buildSystemPrompt(safeLang);
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
    const statusCode = error instanceof ProviderError
      ? (error.statusCode && error.statusCode >= 400 ? 502 : 500)
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
      error: statusCode === 502 ? "AI service error" : "Internal server error",
      request_id: requestId,
    });
  }
});
