import { NextResponse } from 'next/server';
import { knowledgeService } from '@/lib/knowledge-service';
import { promptBuilder } from '@/lib/prompt-builder';
import { aiService } from '@/lib/ai-service';
import { caseService } from '@/lib/case-service';

export async function POST(req: Request) {
  try {
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

    // Save to Database (background operation so it doesn't block response)
    // In real app, user ID comes from JWT context
    caseService.saveNocSession('mock-user-id', effectiveMessage, aiResponse).catch(console.error);

    return NextResponse.json(aiResponse);
  } catch (error) {
    console.error('[NOC Route] Error processing request:', error);
    return NextResponse.json({ error: 'Internal error processing AI request' }, { status: 500 });
  }
}
