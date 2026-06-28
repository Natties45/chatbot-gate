export class OpencodeService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.OPENCODE_SERVER_URL || 'http://localhost:4096';
  }

  async health() {
    const res = await fetch(`${this.baseUrl}/global/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok ? res.json() : null;
  }

  async createSession(title?: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error(`createSession failed: ${res.status}`);
    const data = await res.json();
    return data.id;
  }

  async sendMessage(sessionId: string, agent: string, userText: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/session/${sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent,
        parts: [{ type: 'text', text: userText }],
      }),
    });
    if (!res.ok) throw new Error(`sendMessage failed: ${res.status}`);
    const data = await res.json();
    const parts = data.parts || [];
    const textParts = parts.filter((p: any) => p.type === 'text');
    return textParts.map((p: any) => p.text).join('\n') || JSON.stringify(data);
  }

  async sendSystemMessage(sessionId: string, agent: string, systemPrompt: string, userText: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/session/${sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent,
        system: systemPrompt,
        parts: [{ type: 'text', text: userText }],
      }),
    });
    if (!res.ok) throw new Error(`sendSystemMessage failed: ${res.status}`);
    const data = await res.json();
    const parts = data.parts || [];
    const textParts = parts.filter((p: any) => p.type === 'text');
    return textParts.map((p: any) => p.text).join('\n') || JSON.stringify(data);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await fetch(`${this.baseUrl}/session/${sessionId}`, { method: 'DELETE' });
  }

  async getAgents(): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/agent`);
    if (!res.ok) return [];
    const data = await res.json();
    return data || [];
  }

  async getProviders(): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/config/providers`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.providers || [];
  }
}

export const opencodeService = new OpencodeService();
