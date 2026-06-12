const OPENAI_URL = "https://api.openai.com/v1/responses";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_OPENAI_MODEL = "gpt-5.4-2026-03-05";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-5-20250929";
const DEFAULT_TIMEOUT_MS = 45_000;

export class ProviderError extends Error {
  constructor(message, { provider, retryable = false, statusCode = null, model = null, details = null, missingKey = false } = {}) {
    super(message);
    this.name = "ProviderError";
    this.provider = provider;
    this.retryable = retryable;
    this.statusCode = statusCode;
    this.model = model;
    this.details = details;
    this.missingKey = missingKey;
  }
}

export function hasProviderKey(provider) {
  const name = provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
  return Boolean(process.env[name]?.trim());
}

function getRequiredEnv(name, provider, model) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new ProviderError(`Missing ${name}`, { provider, model, missingKey: true });
  }
  return value;
}

async function fetchWithTimeout(url, init, timeoutMs, provider, model) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    throw new ProviderError(`${provider} request failed`, {
      provider,
      retryable: true,
      model,
      details: error instanceof Error ? error.message : String(error),
    });
  } finally {
    clearTimeout(timer);
  }
}

async function readResponseText(response) {
  try {
    return (await response.text()).slice(0, 2000);
  } catch {
    return null;
  }
}

async function* iterateSseEvents(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    let frameEnd;
    while ((frameEnd = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, frameEnd);
      buffer = buffer.slice(frameEnd + 2);

      const data = frame
        .split("\n")
        .map((line) => line.replace(/\r$/, ""))
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");

      if (data) yield { data };
    }
  }
}

function assertResponseBody(response, provider, model) {
  if (!response.body) {
    throw new ProviderError(`${provider} API returned an empty response body`, {
      provider,
      retryable: true,
      model,
    });
  }
}

export async function streamOpenAIChat({ messages, systemPrompt }) {
  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
  const apiKey = getRequiredEnv("OPENAI_API_KEY", "openai", model);
  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);

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
        instructions: systemPrompt,
        input: messages.map((message) => ({
          role: message.role,
          content: [{ type: "input_text", text: message.content }],
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
  assertResponseBody(response, "openai", model);

  return { provider: "openai", model, textStream: openAiTextStream(response.body, model) };
}

async function* openAiTextStream(body, model) {
  for await (const event of iterateSseEvents(body)) {
    if (!event.data || event.data === "[DONE]") continue;

    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch {
      continue;
    }

    if (payload.type === "response.output_text.delta" && typeof payload.delta === "string") {
      yield payload.delta;
      continue;
    }

    if (payload.type === "response.completed") return;

    if (payload.type === "response.failed" || payload.type === "response.error" || payload.type === "error") {
      throw new ProviderError("OpenAI stream error", {
        provider: "openai",
        retryable: true,
        model,
        details: JSON.stringify(payload).slice(0, 2000),
      });
    }
  }
}

export async function streamAnthropicChat({ messages, systemPrompt }) {
  const model = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL;
  const apiKey = getRequiredEnv("ANTHROPIC_API_KEY", "anthropic", model);
  const timeoutMs = Number(process.env.ANTHROPIC_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);

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
        system: systemPrompt,
        messages,
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
  assertResponseBody(response, "anthropic", model);

  return { provider: "anthropic", model, textStream: anthropicTextStream(response.body, model) };
}

async function* anthropicTextStream(body, model) {
  for await (const event of iterateSseEvents(body)) {
    if (!event.data || event.data === "[DONE]") continue;

    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch {
      continue;
    }

    if (payload.type === "content_block_delta") {
      if (payload.delta?.type === "text_delta" && typeof payload.delta.text === "string") {
        yield payload.delta.text;
      }
      continue;
    }

    if (payload.type === "error") {
      throw new ProviderError("Anthropic stream error", {
        provider: "anthropic",
        retryable: true,
        model,
        details: JSON.stringify(payload).slice(0, 2000),
      });
    }
  }
}
