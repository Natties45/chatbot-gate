export type LlmProvider = 'groq' | 'ollama';

export type LlmErrorCode =
  | 'rate_limit'
  | 'provider_down'
  | 'bad_request'
  | 'auth_error'
  | 'local_unavailable';

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface LlmMessage {
  role: ChatRole;
  content: string;
}

export interface LlmResponse {
  content: string;
  provider: LlmProvider;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  fallbackFrom?: LlmProvider;
}

export class LlmProviderError extends Error {
  code: LlmErrorCode;
  status?: number;

  constructor(code: LlmErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'LlmProviderError';
    this.code = code;
    this.status = status;
  }
}

export function isLlmProviderError(error: unknown): error is LlmProviderError {
  return error instanceof LlmProviderError;
}
