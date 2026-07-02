export interface OpenCodeResearchResult {
  success: boolean;
  output: string;
  error?: string;
}

const OPENCODE_URL = process.env.OPENCODE_URL || 'http://opencode:4096';

export async function opencodeResearch(issue: string): Promise<OpenCodeResearchResult> {
  try {
    const response = await fetch(`${OPENCODE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: [
          'You are an Operation research assistant.',
          'Search for external technical references, known issues, and fixes.',
          'Return concise Thai findings with source URLs where available.',
          '',
          issue,
        ].join('\n'),
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      return { success: false, output: '', error: `OpenCode returned ${response.status}` };
    }

    const data = await response.json();
    const output = typeof data.response === 'string' ? data.response : JSON.stringify(data, null, 2);
    return { success: true, output };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OpenCode unavailable';
    return { success: false, output: '', error: message };
  }
}
