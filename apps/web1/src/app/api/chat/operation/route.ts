import { NextRequest, NextResponse } from 'next/server';
import { opencodeService } from '@/lib/opencode-service';
import { requireAuth } from '@/lib/auth';
import { createCase, addMessage, getCaseBySessionId, closeCase } from '@/lib/case-db';
import fs from 'fs/promises';
import path from 'path';

const OP_AGENT = 'operation-agent';
const PROMPT_DIR = path.join(process.cwd(), 'gate-answer', 'prompts');

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(['admin', 'operation']);
    const body = await req.json();
    const { action, message, sessionId } = body;

    switch (action) {
      case 'init': {
        const health = await opencodeService.health();
        if (!health) {
          return NextResponse.json({ error: 'opencode server not reachable' }, { status: 503 });
        }
        
        const opencodeSessionId = await opencodeService.createSession('Operation Chat');
        const dbCase = await createCase({
          userId: user.id,
          username: user.username,
          userRole: user.role,
          page: 'Operation',
          sessionId: opencodeSessionId,
        });

        return NextResponse.json({
          sessionId: opencodeSessionId,
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

        let systemPrompt = await fs.readFile(path.join(PROMPT_DIR, 'op-send.md'), 'utf-8');

        if (body.history && Array.isArray(body.history) && body.history.length > 0) {
          const historyText = body.history
            .map((m: any) => `${m.role === 'user' ? 'Customer' : 'Agent'}: ${m.content}`)
            .join('\n\n');
          systemPrompt = `Previous conversation:\n${historyText}\n\n---\n${systemPrompt}`;
        }

        const interpolated = systemPrompt.replace('{{MESSAGE}}', message || '');

        // Save user message to database
        await addMessage({
          caseId: dbCase.id,
          role: 'user',
          content: message || '',
        });

        const response = await opencodeService.sendSystemMessage(sessionId, OP_AGENT, interpolated, message || '');

        // Save assistant message to database
        await addMessage({
          caseId: dbCase.id,
          role: 'assistant',
          content: response,
        });

        return NextResponse.json({ response });
      }

      case 'close': {
        if (!sessionId) {
          return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
        }

        const dbCase = await getCaseBySessionId(sessionId);
        if (!dbCase) {
          return NextResponse.json({ error: 'Active case not found for session' }, { status: 404 });
        }

        const systemPrompt = await fs.readFile(path.join(PROMPT_DIR, 'op-close.md'), 'utf-8');
        
        const confirmMsg = `[CLOSE CASE] Generate a structured JSON case summary.`;
        const aiOutput = await opencodeService.sendSystemMessage(sessionId, OP_AGENT, systemPrompt, confirmMsg);

        // Update case status to closed in DB & parse JSON output
        const closed = await closeCase(sessionId, aiOutput);

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
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 });
    }
    console.error('[Operation API]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
