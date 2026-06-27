export interface AiResponse {
  category: string;
  confidence: number;
  summary: string;
  sources: Array<string | { title: string; url: string }>;
  responseTicket: string;
  responseEmail: string;
  isEscalated: boolean;
}

export class AiService {
  private apiUrl = process.env.OPENCODE_API_URL || 'https://api.opencode.ai/v1/chat/completions';
  private apiKey = process.env.OPENCODE_API_KEY || '';
  private model = process.env.AI_MODEL || 'deepseek-flash';

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async generateNocResponse(systemPrompt: string, userMessage: string): Promise<AiResponse> {
    const content = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ], true);

    return JSON.parse(content) as AiResponse;
  }

  async generateOperationResponse(userMessage: string): Promise<string> {
    return this.chat([
      {
        role: 'system',
        content:
          'You are an operations engineering assistant. Analyze logs or operational questions and reply in Thai with concise diagnosis, likely cause, and next actions.',
      },
      { role: 'user', content: userMessage },
    ]);
  }

  async getAvailableModels(): Promise<string[]> {
    if (!this.apiKey) return [this.model];

    try {
      const response = await fetch(this.apiUrl.replace('/chat/completions', '/models'), {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (response.ok) {
        const data = await response.json();
        return data.data.map((m: any) => m.id);
      }
    } catch (error) {
      console.error('[AiService] Error fetching models', error);
    }

    return [this.model];
  }

  private async chat(messages: Array<{ role: string; content: string }>, jsonMode = false) {
    if (!this.apiKey) {
      throw new Error('AI provider is not configured. Set OPENCODE_API_KEY in the server environment.');
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.2,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API Error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('AI provider returned an empty response.');
    }

    return content;
  }
}

export const aiService = new AiService();
