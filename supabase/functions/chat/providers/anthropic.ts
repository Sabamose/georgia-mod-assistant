import { iterateSseEvents } from "../stream-normalizer.ts";
import { fetchWithTimeout, getRequiredEnv, readResponseText } from "./shared.ts";
import {
  ProviderError,
  type StreamChatInput,
  type StreamChatResult,
} from "./types.ts";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";
const DEFAULT_TIMEOUT_MS = 45_000;

export async function streamAnthropicChat(
  input: StreamChatInput,
): Promise<StreamChatResult> {
  const model = Deno.env.get("ANTHROPIC_MODEL")?.trim() || DEFAULT_MODEL;
  const apiKey = getRequiredEnv("ANTHROPIC_API_KEY", "anthropic", model);
  const timeoutMs = Number(Deno.env.get("ANTHROPIC_TIMEOUT_MS") || DEFAULT_TIMEOUT_MS);

  const response = await fetchWithTimeout(
    ANTHROPIC_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: input.systemPrompt,
        messages: input.messages,
        stream: true,
      }),
    },
    timeoutMs,
    "anthropic",
    model,
  );

  if (!response.ok) {
    const details = await readResponseText(response);
    throw new ProviderError("Anthropic API error", {
      provider: "anthropic",
      retryable: response.status === 408 || response.status === 409 ||
        response.status === 429 || response.status >= 500,
      statusCode: response.status,
      model,
      details,
    });
  }

  if (!response.body) {
    throw new ProviderError("Anthropic API returned an empty response body", {
      provider: "anthropic",
      retryable: true,
      model,
    });
  }

  return {
    provider: "anthropic",
    model,
    textStream: anthropicTextStream(response.body, model),
  };
}

async function* anthropicTextStream(
  body: ReadableStream<Uint8Array>,
  model: string,
): AsyncGenerator<string> {
  for await (const event of iterateSseEvents(body)) {
    if (!event.data || event.data === "[DONE]") continue;

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(event.data);
    } catch {
      continue;
    }

    if (payload.type === "content_block_delta") {
      const delta = payload.delta as Record<string, unknown> | undefined;
      if (delta?.type === "text_delta" && typeof delta.text === "string") {
        yield delta.text;
      }
      continue;
    }

    if (payload.type === "error") {
      throw new ProviderError("Anthropic stream error", {
        provider: "anthropic",
        retryable: true,
        model,
        details: JSON.stringify(payload),
      });
    }
  }
}
