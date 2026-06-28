import { NextRequest, NextResponse } from 'next/server';
import { opencodeService } from '@/lib/opencode-service';
import fs from 'fs/promises';
import path from 'path';

const OP_AGENT = 'operation-agent';
const PROMPT_DIR = path.join(process.cwd(), '..', '..', 'gate-answer', 'prompts');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, message, sessionId } = body;

    switch (action) {
      case 'init': {
        const health = await opencodeService.health();
        if (!health) {
          return NextResponse.json({ error: 'opencode server not reachable' }, { status: 503 });
        }
        const id = await opencodeService.createSession('Operation Chat');
        return NextResponse.json({ sessionId: id });
      }

      case 'message': {
        if (!sessionId) {
          return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
        }
        let systemPrompt = await fs.readFile(path.join(PROMPT_DIR, 'op-send.md'), 'utf-8');

        if (body.history && Array.isArray(body.history) && body.history.length > 0) {
          const historyText = body.history
            .map((m: any) => `${m.role === 'user' ? 'Customer' : 'Agent'}: ${m.content}`)
            .join('\n\n');
          systemPrompt = `Previous conversation:\n${historyText}\n\n---\n${systemPrompt}`;
        }

        const interpolated = systemPrompt.replace('{{MESSAGE}}', message || '');
        const response = await opencodeService.sendSystemMessage(sessionId, OP_AGENT, interpolated, message || '');
        return NextResponse.json({ response });
      }

      case 'close': {
        if (!sessionId) {
          return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
        }
        const confirmMsg = `[CLOSE CASE] Save case log for session ${sessionId}. Generate a structured case summary.`;
        const summary = await opencodeService.sendSystemMessage(sessionId, OP_AGENT, 'You are in build mode. Save a case log file.', confirmMsg);
        return NextResponse.json({ summary, sessionId });
      }

      default:
        return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('[Operation API]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
