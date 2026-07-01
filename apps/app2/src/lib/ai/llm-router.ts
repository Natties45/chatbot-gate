import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings-db';
import { chatWithGroq } from './providers/groq';
import { chatWithOllama } from './providers/ollama';
import { isLlmProviderError, LlmMessage, LlmProvider, LlmProviderError, LlmResponse } from './types';

interface RouteLlmParams {
  caseId?: string;
  messages: LlmMessage[];
  fallbackMessages?: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
}

const GROQ_TIMEOUT_MS = 60_000;
const OLLAMA_TIMEOUT_MS = 180_000;

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  return value !== 'false';
}

function shouldFallback(error: unknown): boolean {
  if (!isLlmProviderError(error)) return true;
  return error.code === 'rate_limit' || error.code === 'provider_down' || error.code === 'auth_error';
}

async function logLlmAttempt(params: {
  caseId?: string;
  provider: LlmProvider;
  model: string;
  status: 'success' | 'error' | 'fallback';
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  errorCode?: string;
  errorMessage?: string;
}) {
  if (!params.caseId) return;

  try {
    await prisma.llmCallLog.create({
      data: {
        caseId: params.caseId,
        provider: params.provider,
        model: params.model,
        status: params.status,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        latencyMs: params.latencyMs,
        errorCode: params.errorCode,
        errorMessage: params.errorMessage?.slice(0, 500),
      },
    });
  } catch (error) {
    console.error('[LLM Router] Failed to write LlmCallLog:', error);
  }
}

async function callProvider(params: {
  provider: LlmProvider;
  model: string;
  messages: LlmMessage[];
  temperature?: number;
  maxTokens: number;
}): Promise<LlmResponse> {
  if (params.provider === 'groq') {
    return chatWithGroq({
      apiKey: process.env.GROQ_API_KEY || '',
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
      timeoutMs: GROQ_TIMEOUT_MS,
    });
  }

  return chatWithOllama({
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: params.model,
    messages: params.messages,
    temperature: params.temperature,
    maxTokens: params.maxTokens,
    timeoutMs: OLLAMA_TIMEOUT_MS,
  });
}

function normalizeProvider(value: string | undefined, fallback: LlmProvider): LlmProvider {
  return value === 'ollama' || value === 'groq' ? value : fallback;
}

export async function routeLlm(params: RouteLlmParams): Promise<LlmResponse> {
  const settings = await getSettings();
  const primaryProvider = normalizeProvider(settings['llm.primaryProvider'] || process.env.APP2_PRIMARY_PROVIDER, 'groq');
  const primaryModel = settings['llm.primaryModel'] || process.env.APP2_PRIMARY_MODEL || 'qwen/qwen3-32b';
  const fallbackProvider = normalizeProvider(settings['llm.fallbackProvider'] || process.env.APP2_FALLBACK_PROVIDER, 'ollama');
  const fallbackModel = settings['llm.fallbackModel'] || process.env.APP2_FALLBACK_MODEL || 'qwen3:4b';
  const fallbackEnabled = parseBoolean(settings['llm.enableFallback'], true);
  const maxTokens = params.maxTokens ?? parseNumber(settings['llm.maxOutputTokens'], 2048);

  try {
    const response = await callProvider({
      provider: primaryProvider,
      model: primaryModel,
      messages: params.messages,
      temperature: params.temperature,
      maxTokens,
    });

    await logLlmAttempt({
      caseId: params.caseId,
      provider: response.provider,
      model: response.model,
      status: 'success',
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      latencyMs: response.latencyMs,
    });

    return response;
  } catch (error) {
    const providerError = isLlmProviderError(error)
      ? error
      : new LlmProviderError('provider_down', error instanceof Error ? error.message : 'Primary provider failed');

    await logLlmAttempt({
      caseId: params.caseId,
      provider: primaryProvider,
      model: primaryModel,
      status: 'error',
      errorCode: providerError.code,
      errorMessage: providerError.message,
    });

    if (!fallbackEnabled || !shouldFallback(providerError)) {
      throw providerError;
    }
  }

  const fallbackResponse = await callProvider({
    provider: fallbackProvider,
    model: fallbackModel,
    messages: params.fallbackMessages || params.messages,
    temperature: params.temperature,
    maxTokens: Math.min(maxTokens, 1024),
  });

  await logLlmAttempt({
    caseId: params.caseId,
    provider: fallbackResponse.provider,
    model: fallbackResponse.model,
    status: 'fallback',
    inputTokens: fallbackResponse.inputTokens,
    outputTokens: fallbackResponse.outputTokens,
    latencyMs: fallbackResponse.latencyMs,
  });

  return {
    ...fallbackResponse,
    fallbackFrom: primaryProvider,
  };
}
