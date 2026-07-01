import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '@/lib/auth';
import { createCase, addMessage, getCaseBySessionId, closeCase } from '@/lib/case-db';
import { runChatAction } from '@/lib/ai/ai-brain';
import { isLlmProviderError } from '@/lib/ai/types';

interface ChatHistoryItem {
  role: string;
  content: string;
}

interface NocRequestBody {
  action?: string;
  message?: string;
  sessionId?: string;
  promptType?: string;
  additionalInfo?: string;
  history?: ChatHistoryItem[];
}

const ALLOWED_PROMPT_TYPES = new Set([
  'analyze',
  'draft',
  'email',
  'feedback',
  'close',
  'chat',
  'draft-feedback',
]);

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Internal error';
}

function jsonError(error: unknown) {
  const message = getErrorMessage(error);

  if (message === 'Unauthorized' || message === 'Forbidden') {
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 403 });
  }

  if (isLlmProviderError(error)) {
    const status = error.code === 'bad_request' ? 400 : 503;
    return NextResponse.json({ error: `AI provider unavailable: ${error.message}` }, { status });
  }

  if (message.startsWith('Prompt file not found')) {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  console.error('[NOC API]', error);
  return NextResponse.json({ error: 'Internal error' }, { status: 500 });
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(['admin', 'noc']);
    const body = (await req.json()) as NocRequestBody;
    const { action, message, sessionId, additionalInfo } = body;

    switch (action) {
      case 'init': {
        const appSessionId = uuidv4();
        const dbCase = await createCase({
          userId: user.id,
          username: user.username,
          userRole: user.role,
          page: 'NOC',
          sessionId: appSessionId,
        });

        return NextResponse.json({
          sessionId: appSessionId,
          dbCaseId: dbCase.id,
          caseId: dbCase.caseId,
        });
      }

      case 'message': {
        if (!sessionId) {
          return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
        }

        const promptType = body.promptType || 'chat';
        if (!ALLOWED_PROMPT_TYPES.has(promptType)) {
          return NextResponse.json({ error: `invalid promptType: ${promptType}` }, { status: 400 });
        }

        const dbCase = await getCaseBySessionId(sessionId, user.id, 'NOC');
        if (!dbCase) {
          return NextResponse.json({ error: 'Active case not found for session' }, { status: 404 });
        }

        const isFeedbackType = promptType === 'feedback' || promptType === 'draft-feedback';
        const userText = isFeedbackType ? additionalInfo || message || '' : message || `Process ${promptType} request`;

        await addMessage({
          caseId: dbCase.id,
          role: 'user',
          content: userText,
        });

        const response = await runChatAction({
          role: 'noc',
          dbCaseId: dbCase.id,
          caseId: dbCase.caseId,
          sessionId,
          promptType,
          message,
          additionalInfo,
          history: body.history,
          user,
        });

        await addMessage({
          caseId: dbCase.id,
          role: 'assistant',
          kind: promptType === 'draft' ? 'draft' : 'message',
          content: response.content,
          model: response.model,
          provider: response.provider,
        });

        return NextResponse.json({
          response: response.content,
          provider: response.provider,
          model: response.model,
          fallbackFrom: response.fallbackFrom,
        });
      }

      case 'close': {
        if (!sessionId) {
          return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
        }

        const dbCase = await getCaseBySessionId(sessionId, user.id, 'NOC');
        if (!dbCase) {
          return NextResponse.json({ error: 'Active case not found for session' }, { status: 404 });
        }

        const response = await runChatAction({
          role: 'noc',
          dbCaseId: dbCase.id,
          caseId: dbCase.caseId,
          sessionId,
          promptType: 'close',
          message: `Close case ${dbCase.caseId}`,
          history: body.history,
          user,
        });

        await addMessage({
          caseId: dbCase.id,
          role: 'assistant',
          kind: 'close',
          content: response.content,
          model: response.model,
          provider: response.provider,
        });

        const closed = await closeCase(sessionId, response.content, user.id, 'NOC');

        return NextResponse.json({
          success: true,
          summary: closed.summary,
          detail: closed.detail,
          sessionId,
        });
      }

      default:
        return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return jsonError(error);
  }
}
