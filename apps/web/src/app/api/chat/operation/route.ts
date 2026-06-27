import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { aiService } from '@/lib/ai-service';
import { caseService } from '@/lib/case-service';

export async function POST(req: Request) {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;
    if (!['ADMIN', 'OPERATION'].includes(auth.user?.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!aiService.isConfigured()) {
      return NextResponse.json({ error: 'AI provider is not configured' }, { status: 503 });
    }

    const { message } = await req.json();
    const responseText = await aiService.generateOperationResponse(message || '');
    caseService.saveOperationSession(auth.user?.id || 'anonymous', message || '', responseText).catch(console.error);

    return NextResponse.json({ text: responseText });
  } catch (error) {
    console.error('[Operation Route] Error processing request:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
