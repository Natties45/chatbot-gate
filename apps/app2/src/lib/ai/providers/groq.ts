import { LlmMessage, LlmProviderError, LlmResponse } from '../types';

interface GroqChatRequest {
  apiKey: string;
  model: string;
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs: number;
}

interface GroqResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  error?: {
    message?: string;
  };
}

async function readJson(res: Response): Promise<GroqResponse> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as GroqResponse;
  } catch {
    return { error: { message: text } };
  }
}

function classifyGroqStatus(status: number): LlmProviderError['code'] {
  if (status === 401 || status === 403) return 'auth_error';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'provider_down';
  return 'bad_request';
}

export async function chatWithGroq(params: GroqChatRequest): Promise<LlmResponse> {
  if (!params.apiKey) {
    throw new LlmProviderError('auth_error', 'GROQ_API_KEY is not configured');
  }

  const startedAt = Date.now();

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature ?? 0.2,
        max_tokens: params.maxTokens ?? 2048,
      }),
      signal: AbortSignal.timeout(params.timeoutMs),
    });

    const data = await readJson(res);
    if (!res.ok) {
      const message = data.error?.message || `Groq request failed with HTTP ${res.status}`;
      throw new LlmProviderError(classifyGroqStatus(res.status), message, res.status);
    }

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new LlmProviderError('provider_down', 'Groq returned an empty response');
    }

    return {
      content,
      provider: 'groq',
      model: params.model,
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    if (error instanceof LlmProviderError) throw error;
    const message = error instanceof Error ? error.message : 'Groq request failed';
    throw new LlmProviderError('provider_down', message);
  }
}
