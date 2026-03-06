import { iterateSseEvents } from "../stream-normalizer.ts";
import { fetchWithTimeout, getRequiredEnv, readResponseText } from "./shared.ts";
import {
  ProviderError,
  type StreamChatInput,
  type StreamChatResult,
} from "./types.ts";

const OPENAI_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5.4-2026-03-05";
const DEFAULT_TIMEOUT_MS = 45_000;

export async function streamOpenAIChat(
  input: StreamChatInput,
): Promise<StreamChatResult> {
  const model = Deno.env.get("OPENAI_MODEL")?.trim() || DEFAULT_MODEL;
  const apiKey = getRequiredEnv("OPENAI_API_KEY", "openai", model);
  const timeoutMs = Number(Deno.env.get("OPENAI_TIMEOUT_MS") || DEFAULT_TIMEOUT_MS);

  if (Deno.env.get("OPENAI_FORCE_FAILURE") === "1") {
    throw new ProviderError("OpenAI failure forced by OPENAI_FORCE_FAILURE", {
      provider: "openai",
      retryable: true,
      model,
    });
  }

  const response = await fetchWithTimeout(
    OPENAI_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        stream: true,
        max_output_tokens: 1024,
        instructions: input.systemPrompt,
        input: input.messages.map((message) => ({
          role: message.role,
          content: [{
            type: "input_text",
            text: message.content,
          }],
        })),
      }),
    },
    timeoutMs,
    "openai",
    model,
  );

  if (!response.ok) {
    const details = await readResponseText(response);
    throw new ProviderError("OpenAI API error", {
      provider: "openai",
      retryable: response.status === 408 || response.status === 409 ||
        response.status === 429 || response.status >= 500,
      statusCode: response.status,
      model,
      details,
    });
  }

  if (!response.body) {
    throw new ProviderError("OpenAI API returned an empty response body", {
      provider: "openai",
      retryable: true,
      model,
    });
  }

  return {
    provider: "openai",
    model,
    textStream: openAiTextStream(response.body, model),
  };
}

async function* openAiTextStream(
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

    if (payload.type === "response.output_text.delta" && typeof payload.delta === "string") {
      yield payload.delta;
      continue;
    }

    if (payload.type === "response.completed") {
      return;
    }

    if (payload.type === "response.failed" || payload.type === "response.error" ||
      payload.type === "error") {
      throw new ProviderError("OpenAI stream error", {
        provider: "openai",
        retryable: true,
        model,
        details: JSON.stringify(payload),
      });
    }
  }
}
