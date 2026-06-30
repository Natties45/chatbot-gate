import { NextRequest, NextResponse } from 'next/server';
import { opencodeService } from '@/lib/opencode-service';
import { requireAuth } from '@/lib/auth';
import { createCase, addMessage, getCaseBySessionId, closeCase } from '@/lib/case-db';
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
    const user = await requireAuth(['admin', 'noc']);
    body = await req.json();
    const { action, message, sessionId, promptType, additionalInfo } = body;

    switch (action) {
      case 'init': {
        const health = await opencodeService.health();
        if (!health) {
          return NextResponse.json({ error: 'opencode server not reachable' }, { status: 503 });
        }
        
        const opencodeSessionId = await opencodeService.createSession('NOC Chat');
        const dbCase = await createCase({
          userId: user.id,
          username: user.username,
          userRole: user.role,
          page: 'NOC',
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
        if (!promptType || !AGENT_MAP[promptType]) {
          return NextResponse.json({ error: `invalid promptType: ${promptType}` }, { status: 400 });
        }

        const dbCase = await getCaseBySessionId(sessionId);
        if (!dbCase) {
          return NextResponse.json({ error: 'Active case not found for session' }, { status: 404 });
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

        // Save user message to database
        await addMessage({
          caseId: dbCase.id,
          role: 'user',
          content: userText,
        });

        const response = await opencodeService.sendSystemMessage(sessionId, agent, systemPrompt, userText);

        // Save assistant message to database
        await addMessage({
          caseId: dbCase.id,
          role: 'assistant',
          kind: promptType === 'draft' ? 'draft' : 'message',
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

        const systemPrompt = await loadPromptFile('close');
        const interpolated = interpolate(systemPrompt, { SESSION_ID: sessionId });
        
        const aiOutput = await opencodeService.sendSystemMessage(sessionId, 'noc-closer', interpolated, `Close session ${sessionId}`);

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
    console.error('[NOC API]', error);
    if (error?.code === 'ENOENT') {
      return NextResponse.json({ error: `Prompt file not found: noc-${body?.promptType}.md` }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
