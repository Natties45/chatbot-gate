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

interface OperationRequestBody {
  action?: string;
  message?: string;
  sessionId?: string;
  history?: ChatHistoryItem[];
}

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

  console.error('[Operation API]', error);
  return NextResponse.json({ error: 'Internal error' }, { status: 500 });
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(['admin', 'operation']);
    const body = (await req.json()) as OperationRequestBody;
    const { action, message, sessionId } = body;

    switch (action) {
      case 'init': {
        const appSessionId = uuidv4();
        const dbCase = await createCase({
          userId: user.id,
          username: user.username,
          userRole: user.role,
          page: 'Operation',
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

        const dbCase = await getCaseBySessionId(sessionId);
        if (!dbCase) {
          return NextResponse.json({ error: 'Active case not found for session' }, { status: 404 });
        }

        await addMessage({
          caseId: dbCase.id,
          role: 'user',
          content: message || '',
        });

        const response = await runChatAction({
          role: 'operation',
          dbCaseId: dbCase.id,
          caseId: dbCase.caseId,
          sessionId,
          promptType: 'message',
          message,
          history: body.history,
          user,
        });

        await addMessage({
          caseId: dbCase.id,
          role: 'assistant',
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

        const dbCase = await getCaseBySessionId(sessionId);
        if (!dbCase) {
          return NextResponse.json({ error: 'Active case not found for session' }, { status: 404 });
        }

        const response = await runChatAction({
          role: 'operation',
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

        const closed = await closeCase(sessionId, response.content);

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
