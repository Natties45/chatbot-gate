import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CaseService {
  async saveNocSession(userId: string, userMessage: string, aiResponse: any) {
    try {
      // Create CaseLog
      const newCase = await prisma.caseLog.create({
        data: {
          role: 'NOC',
          category: aiResponse.category || 'Unknown',
          status: 'OPEN',
          confidence: aiResponse.confidence || 0,
          summary: aiResponse.summary || '',
          detail: userMessage,
          userId: userId || 'anonymous',
          messages: {
            create: [
              {
                role: 'user',
                content: userMessage
              },
              {
                role: 'assistant',
                content: JSON.stringify(aiResponse),
                metadata: JSON.stringify({
                  category: aiResponse.category,
                  confidence: aiResponse.confidence,
                  sources: aiResponse.sources
                })
              }
            ]
          }
        }
      });
      return newCase;
    } catch (error) {
      console.error('[CaseService] Error saving case session:', error);
      return null;
    }
  }
}

export const caseService = new CaseService();
