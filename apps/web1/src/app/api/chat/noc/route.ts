import { NextRequest, NextResponse } from 'next/server';
import { opencodeService } from '@/lib/opencode-service';
import fs from 'fs/promises';
import path from 'path';

const PROMPT_DIR = path.join(process.cwd(), 'gate-answer', 'prompts');

const AGENT_MAP: Record<string, string> = {
  analyze: 'noc-agent',
  draft: 'noc-agent',
  email: 'noc-agent',
  feedback: 'noc-agent',
  close: 'noc-closer',
  chat: 'noc-agent',
  'draft-feedback': 'noc-agent',
};

async function loadPromptFile(promptType: string): Promise<string> {
  const filePath = path.join(PROMPT_DIR, `noc-${promptType}.md`);
  return fs.readFile(filePath, 'utf-8');
}

function interpolate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.split(`{{${key}}}`).join(value);
  }
  return result;
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
    const { action, message, sessionId, promptType, additionalInfo } = body;

    switch (action) {
      case 'init': {
        const health = await opencodeService.health();
        if (!health) {
          return NextResponse.json({ error: 'opencode server not reachable' }, { status: 503 });
        }
        const id = await opencodeService.createSession('NOC Chat');
        return NextResponse.json({ sessionId: id });
      }

      case 'message': {
        if (!sessionId) {
          return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
        }
        if (!promptType || !AGENT_MAP[promptType]) {
          return NextResponse.json({ error: `invalid promptType: ${promptType}` }, { status: 400 });
        }

        const agent = AGENT_MAP[promptType];
        let systemPrompt = await loadPromptFile(promptType);

        if (body.history && Array.isArray(body.history) && body.history.length > 0) {
          const historyText = body.history
            .map((m: any) => `${m.role === 'user' ? 'Customer' : 'Agent'}: ${m.content}`)
            .join('\n\n');
          systemPrompt = `Previous conversation:\n${historyText}\n\n---\n${systemPrompt}`;
        }

        systemPrompt = interpolate(systemPrompt, {
          MESSAGE: message || '',
          FEEDBACK: additionalInfo || '',
          SESSION_ID: sessionId,
        });

        const isFeedbackType = promptType === 'feedback' || promptType === 'draft-feedback';
        const userText = isFeedbackType ? (additionalInfo || message || '') : (message || `Process ${promptType} request`);
        const response = await opencodeService.sendSystemMessage(sessionId, agent, systemPrompt, userText);
        return NextResponse.json({ response });
      }

      case 'close': {
        if (!sessionId) {
          return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
        }
        const systemPrompt = await loadPromptFile('close');
        const interpolated = interpolate(systemPrompt, { SESSION_ID: sessionId });
        const summary = await opencodeService.sendSystemMessage(sessionId, 'noc-closer', interpolated, `Close session ${sessionId}`);
        return NextResponse.json({ summary, sessionId });
      }

      default:
        return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[NOC API]', error);
    if (error?.code === 'ENOENT') {
      return NextResponse.json({ error: `Prompt file not found: noc-${body?.promptType}.md` }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
