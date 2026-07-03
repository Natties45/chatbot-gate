import { LlmMessage, LlmProviderError, LlmResponse } from '../types';

interface OllamaChatRequest {
  baseUrl: string;
  model: string;
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs: number;
}

interface OllamaResponse {
  message?: {
    content?: string;
  };
  response?: string;
  error?: string;
  prompt_eval_count?: number;
  eval_count?: number;
}

async function readJson(res: Response): Promise<OllamaResponse> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as OllamaResponse;
  } catch {
    return { error: text };
  }
}

export async function chatWithOllama(params: OllamaChatRequest): Promise<LlmResponse> {
  const baseUrl = params.baseUrl.replace(/\/$/, '');
  const startedAt = Date.now();

  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        stream: false,
        options: {
          temperature: params.temperature ?? 0.2,
          num_predict: params.maxTokens ?? 1024,
          num_ctx: 4096,
        },
      }),
      signal: AbortSignal.timeout(params.timeoutMs),
    });

    const data = await readJson(res);
    if (!res.ok) {
      throw new LlmProviderError(
        'local_unavailable',
        data.error || `Ollama request failed with HTTP ${res.status}`,
        res.status,
      );
    }

    const content = (data.message?.content || data.response || '').trim();
    if (!content) {
      throw new LlmProviderError('local_unavailable', 'Ollama returned an empty response');
    }

    return {
      content,
      provider: 'ollama',
      model: params.model,
      inputTokens: data.prompt_eval_count,
      outputTokens: data.eval_count,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    if (error instanceof LlmProviderError) throw error;
    const message = error instanceof Error ? error.message : 'Ollama request failed';
    throw new LlmProviderError('local_unavailable', message);
  }
}
