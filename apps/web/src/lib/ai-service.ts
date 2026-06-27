export interface AiResponse {
  category: string;
  confidence: number;
  summary: string;
  sources: { title: string; url: string }[];
  responseTicket: string;
  responseEmail: string;
  isEscalated: boolean;
}

export class AiService {
  private apiUrl = process.env.OPENCODE_API_URL || 'https://api.opencode.ai/v1/chat/completions';
  private apiKey = process.env.OPENCODE_API_KEY || ''; 
  private model = process.env.AI_MODEL || 'deepseek-flash';

  constructor() {}

  async generateNocResponse(systemPrompt: string, userMessage: string): Promise<AiResponse> {
    try {
      // Using OpenAI-compatible endpoint structure as a best guess for opencode.ai
      const payload = {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        response_format: { type: "json_object" }, // Request JSON output
        temperature: 0.2
      };

      console.log(`[AiService] Calling Opencode API (${this.model})...`);
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      try {
        const parsed: AiResponse = JSON.parse(content);
        return parsed;
      } catch (parseError) {
        console.error('[AiService] Failed to parse JSON from AI response:', content);
        throw parseError;
      }
    } catch (error) {
      console.error('[AiService] Error generating response:', error);
      // Fallback response for safe degradation
      return {
        category: "Unknown",
        confidence: 0,
        summary: "System encountered an error connecting to AI service.",
        sources: [],
        responseTicket: "ขออภัย ระบบตอบกลับอัตโนมัติขัดข้อง กรุณารอสักครู่...",
        responseEmail: "ขออภัย ระบบตอบกลับอัตโนมัติขัดข้อง กรุณารอสักครู่...",
        isEscalated: true
      };
    }
  }

  // Stub to fetch models from opencode.ai as requested by the user
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(this.apiUrl.replace('/chat/completions', '/models'), {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      if (response.ok) {
        const data = await response.json();
        return data.data.map((m: any) => m.id);
      }
    } catch (e) {
      console.error('[AiService] Error fetching models', e);
    }
    // Fallback static list
    return ['deepseek-flash', 'deepseek-pro'];
  }
}

export const aiService = new AiService();
