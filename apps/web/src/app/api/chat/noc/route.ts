import { NextResponse } from 'next/server';
import { knowledgeService } from '@/lib/knowledge-service';
import { promptBuilder } from '@/lib/prompt-builder';
import { aiService } from '@/lib/ai-service';
import { caseService } from '@/lib/case-service';
import { requireSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;
    if (!['ADMIN', 'NOC'].includes(auth.user?.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!aiService.isConfigured()) {
      return NextResponse.json({ error: 'AI provider is not configured' }, { status: 503 });
    }

    const body = await req.json();
    const { message, feedback } = body;
    
    // Ensure knowledge base is initialized
    await knowledgeService.init();

    // Context message for AI
    const effectiveMessage = feedback 
      ? `Original message: ${message}\nFeedback from user: ${feedback}\nPlease refine the response based on the feedback.`
      : message;

    // Search KB
    const matchedKnowledge = knowledgeService.search(effectiveMessage, 3);

    // Build Prompt
    const systemPrompt = await promptBuilder.buildNocPrompt(effectiveMessage, matchedKnowledge);

    // Call AI
    const aiResponse = await aiService.generateNocResponse(systemPrompt, effectiveMessage);
    const normalizedResponse = {
      ...aiResponse,
      sources: aiResponse.sources.map((source: any) => {
        if (typeof source === 'string') return source;
        return source?.title || source?.url || 'Unknown source';
      }),
    };

    caseService.saveNocSession(auth.user?.id || 'anonymous', effectiveMessage, normalizedResponse).catch(console.error);

    return NextResponse.json(normalizedResponse);
  } catch (error) {
    console.error('[NOC Route] Error processing request:', error);
    return NextResponse.json({ error: 'Internal error processing AI request' }, { status: 500 });
  }
}
