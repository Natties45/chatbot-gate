import { prisma } from './db';
import { Case, ChatMessage } from '@prisma/client';

export async function generateCaseId(): Promise<string> {
  const now = new Date();
  
  // Format in Bangkok Time
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(now);
  const day = parts.find(p => p.type === 'day')?.value || '01';
  const month = parts.find(p => p.type === 'month')?.value || '01';
  const yearAD = parseInt(parts.find(p => p.type === 'year')?.value || '2026');
  const yearBE = (yearAD + 543) % 100;
  const yearStr = yearBE.toString().padStart(2, '0');

  const prefix = `${day}${month}${yearStr}`; // DDMMYY

  const count = await prisma.case.count({
    where: {
      caseId: {
        startsWith: prefix
      }
    }
  });

  const nextNum = (count + 1).toString().padStart(2, '0');
  return `${prefix}${nextNum}`;
}

export interface CreateCaseParams {
  userId: string;
  username: string;
  userRole: string;
  page: string;
  sessionId: string;
}

export async function createCase(params: CreateCaseParams): Promise<Case> {
  const caseId = await generateCaseId();
  return prisma.case.create({
    data: {
      caseId,
      userId: params.userId,
      username: params.username,
      userRole: params.userRole,
      page: params.page,
      sessionId: params.sessionId,
      status: 'in_progress',
    }
  });
}

export interface AddMessageParams {
  caseId: string; // This is the DB uuid (Case.id) or we can use Case.caseId, but schema specifies Case.id
  role: 'user' | 'assistant';
  kind?: 'message' | 'draft' | 'system';
  content: string;
}

export async function addMessage(params: AddMessageParams): Promise<ChatMessage> {
  const message = await prisma.chatMessage.create({
    data: {
      caseId: params.caseId,
      role: params.role,
      kind: params.kind || 'message',
      content: params.content,
    }
  });

  // Update Case's updatedAt and preview
  let previewText = params.content;
  if (params.kind === 'draft') {
    previewText = `[ร่างคำตอบ]`;
  } else if (params.content.length > 80) {
    previewText = params.content.slice(0, 80) + '...';
  }

  await prisma.case.update({
    where: { id: params.caseId },
    data: {
      updatedAt: new Date(),
      preview: previewText,
    }
  });

  return message;
}

export async function getCaseBySessionId(sessionId: string): Promise<Case | null> {
  return prisma.case.findFirst({
    where: { sessionId, status: 'in_progress' }
  });
}

export async function closeCase(sessionId: string, aiOutput: string): Promise<Case> {
  let summary = '';
  let detail = '';

  try {
    // Attempt to parse JSON response from the AI
    // The AI might return markdown code block, so let's strip it if needed
    const cleanOutput = aiOutput.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanOutput);
    summary = parsed.summary || '';
    detail = parsed.detail || '';
  } catch (err) {
    console.error('Failed to parse AI close JSON:', err, 'Raw output:', aiOutput);
    // Fallback if not valid JSON
    summary = 'Closed case';
    detail = aiOutput;
  }

  const existingCase = await prisma.case.findFirst({
    where: { sessionId, status: 'in_progress' }
  });

  if (!existingCase) {
    throw new Error(`Active case with session ID ${sessionId} not found`);
  }

  return prisma.case.update({
    where: { id: existingCase.id },
    data: {
      status: 'closed',
      summary,
      detail,
      closedAt: new Date(),
    }
  });
}
