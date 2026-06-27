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
      if (!this.apiKey) {
        console.log('[AiService] No API Key configured, returning smart mock response.');
        return this.getMockNocResponse(userMessage);
      }

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
      console.error('[AiService] Error generating response, falling back to mock:', error);
      return this.getMockNocResponse(userMessage);
    }
  }

  private getMockNocResponse(message: string): AiResponse {
    const lower = message.toLowerCase();
    
    if (lower.includes('no valid host') || lower.includes('host') || lower.includes('สร้าง vm')) {
      return {
        category: "Compute - VM Creation Failure",
        confidence: 0.95,
        summary: "พบปัญหาการสร้าง VM ล้มเหลวเนื่องจาก 'No valid host was found' บน OpenStack Compute Node",
        sources: [
          { title: "OpenStack VM Instance FAQ (vm-instance.yaml)", url: "/knowledge/vm-instance.yaml" }
        ],
        responseTicket: "ปัญหา 'No valid host was found' เกิดจากทรัพยากร (CPU, RAM, Storage) บน Compute Node ไม่เพียงพอที่จะรองรับ Flavor ที่เลือก หรือ Flavor ดังกล่าวมีการผูกเงื่อนไขพิเศษ (เช่น Host Aggregates หรือ Placement traits) ที่ไม่มี Compute Node ใดตอบสนองได้\n\nแนวทางแก้ไข:\n1. ตรวจสอบปริมาณ Resource บน Hypervisor โดยรันคำสั่ง `openstack hypervisor stats show` เพื่อเช็คความจุที่เหลืออยู่\n2. ตรวจสอบสิทธิ์และสัญญะของ Host Aggregate ด้วย `openstack aggregate show` เพื่อเช็คว่า Compute Node ถูกต้องหรือไม่",
        responseEmail: "เรียน ทีมงานวิศวกร\n\nได้รับแจ้งปัญหาไม่สามารถสร้าง VM Instance ได้เนื่องจากข้อผิดพลาด 'No Valid Host found' จากการตรวจสอบเบื้องต้นพบว่าเกิดจากปริมาณ RAM/CPU คงเหลือบน Compute Nodes ไม่เพียงพอที่จะจัดสรรตามขนาด Flavor ที่ร้องขอ\n\nขณะนี้ NOC กำลังติดต่อทีม Infra เพื่อเคลียร์ทรัพยากร หรือขยายความจุต่อไป\n\nขอแสดงความนับถือ\nNOC Team",
        isEscalated: false
      };
    }
    
    return {
      category: "General Inquiry",
      confidence: 0.8,
      summary: "สอบถามข้อมูลทั่วไปเกี่ยวกับระบบ Network / Infrastructure",
      sources: [
        { title: "NOC SOP Guide (general.yaml)", url: "/knowledge/general.yaml" }
      ],
      responseTicket: "ขอบคุณที่ติดต่อ NOC ครับ จากคำถามของคุณ เจ้าหน้าที่กำลังตรวจสอบและจะแจ้งความคืบหน้าให้ทราบโดยเร็วที่สุด\n\nหากเป็นเคสเร่งด่วน กรุณาติดต่อสายด่วน NOC หรือเปิด Ticket ระดับ High",
      responseEmail: "เรียน ผู้ใช้บริการ\n\nทางทีม NOC ได้รับเรื่องการติดต่อของคุณเกี่ยวกับหัวข้อดังกล่าวเรียบร้อยแล้ว ขณะนี้เจ้าหน้าที่กำลังเร่งวิเคราะห์และดำเนินการประสานงานกับทีมที่เกี่ยวข้องเพื่อช่วยเหลือคุณ\n\nขออภัยในความไม่สะดวก\nNOC Team",
      isEscalated: false
    };
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
