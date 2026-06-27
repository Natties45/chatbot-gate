import { getPrisma } from './db';

export class CaseService {
  async saveNocSession(userId: string, userMessage: string, aiResponse: any) {
    try {
      return await getPrisma().caseLog.create({
        data: {
          role: 'NOC',
          category: aiResponse.category || 'Unknown',
          status: aiResponse.isEscalated ? 'PENDING' : 'OPEN',
          confidence: Number(aiResponse.confidence || 0),
          summary: aiResponse.summary || '',
          detail: userMessage,
          userId: userId || 'anonymous',
          messages: {
            create: [
              { role: 'user', content: userMessage },
              {
                role: 'assistant',
                content: JSON.stringify(aiResponse),
                metadata: JSON.stringify({
                  category: aiResponse.category,
                  confidence: aiResponse.confidence,
                  sources: aiResponse.sources,
                }),
              },
            ],
          },
        },
      });
    } catch (error) {
      console.error('[CaseService] Error saving NOC session:', error);
      return null;
    }
  }

  async saveOperationSession(userId: string, userMessage: string, responseText: string) {
    try {
      return await getPrisma().caseLog.create({
        data: {
          role: 'OPERATION',
          category: 'Operation Analysis',
          status: 'OPEN',
          summary: responseText.slice(0, 160),
          detail: userMessage,
          userId: userId || 'anonymous',
          messages: {
            create: [
              { role: 'user', content: userMessage },
              { role: 'assistant', content: responseText },
            ],
          },
        },
      });
    } catch (error) {
      console.error('[CaseService] Error saving operation session:', error);
      return null;
    }
  }
}

export const caseService = new CaseService();
