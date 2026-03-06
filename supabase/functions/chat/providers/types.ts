export type ChatRole = "user" | "assistant";
export type ChatLanguage = "en" | "ka";
export type ChatProviderName = "openai" | "anthropic";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type StreamChatInput = {
  messages: ChatMessage[];
  language: ChatLanguage;
  systemPrompt: string;
  requestId: string;
};

export type StreamChatResult = {
  provider: ChatProviderName;
  model: string;
  textStream: AsyncIterable<string>;
};

export class ProviderError extends Error {
  provider: ChatProviderName;
  retryable: boolean;
  statusCode?: number;
  model?: string;
  details?: string;

  constructor(
    message: string,
    options: {
      provider: ChatProviderName;
      retryable?: boolean;
      statusCode?: number;
      model?: string;
      details?: string;
    },
  ) {
    super(message);
    this.name = "ProviderError";
    this.provider = options.provider;
    this.retryable = options.retryable ?? false;
    this.statusCode = options.statusCode;
    this.model = options.model;
    this.details = options.details;
  }
}

export function isProviderName(value: string | null | undefined): value is ChatProviderName {
  return value === "openai" || value === "anthropic";
}
