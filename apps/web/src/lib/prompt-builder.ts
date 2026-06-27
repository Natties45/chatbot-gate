import { KBEntry } from './knowledge-service';
import fs from 'fs';
import path from 'path';

export class PromptBuilder {
  private basePrompt: string = '';

  constructor() {}

  private async loadFile(relativePath: string): Promise<string> {
    const fallbackPaths = [
      process.env.KB_PATH ? path.join(process.env.KB_PATH, relativePath) : '',
      path.join(process.cwd(), '../../../openstack-support', relativePath),
      path.join(process.cwd(), 'knowledge-base', relativePath),
      path.join(process.cwd(), '../knowledge-base', relativePath)
    ].filter(Boolean);

    for (const filePath of fallbackPaths) {
      try {
        if (fs.existsSync(filePath)) {
          return fs.readFileSync(filePath, 'utf-8');
        }
      } catch (e) {
        // ignore
      }
    }
    return '';
  }

  async buildNocPrompt(userMessage: string, matchedKnowledge: KBEntry[]): Promise<string> {
    // Load AGENTS.md for global rules
    let globalRules = await this.loadFile('AGENTS.md');
    // Load Rinoa agent definition
    let rinoaDef = await this.loadFile('agents/rinoa-reply.md');
    // Load NOC style guide
    let styleGuide = await this.loadFile('style-guide/noc-style.md');

    let prompt = `You are an AI assistant for NOC support.
${globalRules ? `\n--- Global Rules ---\n${globalRules}` : ''}
${rinoaDef ? `\n--- Agent Profile ---\n${rinoaDef}` : ''}
${styleGuide ? `\n--- Style Guide ---\n${styleGuide}` : ''}

You must respond in a structured JSON format according to the wizard flow:
{
  "category": "String (the matched category)",
  "confidence": "Number (0-100)",
  "summary": "String (Summary of the issue)",
  "sources": [{"title": "String", "url": "String"}],
  "responseTicket": "String (Draft response for Ticket)",
  "responseEmail": "String (Draft response for Email)",
  "isEscalated": "Boolean (True if confidence < 50)"
}

--- User Message ---
${userMessage}
`;

    if (matchedKnowledge.length > 0) {
      prompt += `\n--- Knowledge Base Context ---\n`;
      matchedKnowledge.forEach((kb, i) => {
        prompt += `\n[KB Entry ${i + 1} - ${kb.categoryName} > ${kb.sectionName}]`;
        prompt += `\nKeywords: ${kb.keywords.join(', ')}`;
        prompt += `\nIntent: ${kb.intent}`;
        prompt += `\nAnswer: ${kb.answer}`;
        if (kb.refs && kb.refs.length > 0) {
          prompt += `\nReferences: ${kb.refs.map(r => `${r.title} (${r.url})`).join(', ')}`;
        }
        prompt += `\n`;
      });
    } else {
      prompt += `\n--- Knowledge Base Context ---\nNo matching knowledge base entries found. Do your best to assist or escalate.\n`;
    }

    return prompt;
  }
}

export const promptBuilder = new PromptBuilder();
