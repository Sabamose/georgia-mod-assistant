import { ProviderError, type ChatProviderName } from "./types.ts";

export function getRequiredEnv(
  name: string,
  provider: ChatProviderName,
  model?: string,
): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new ProviderError(`Missing required environment variable: ${name}`, {
      provider,
      model,
      details: `Env ${name} is not configured`,
    });
  }
  return value;
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  provider: ChatProviderName,
  model?: string,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort("timeout"), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ProviderError("Provider request timed out", {
        provider,
        retryable: true,
        model,
      });
    }
    throw new ProviderError("Provider request failed", {
      provider,
      retryable: true,
      model,
      details: error instanceof Error ? error.message : String(error),
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function readResponseText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}
