import { loadActionPrompt, loadRolePrompt, AppPromptRole, interpolatePrompt } from './prompt-registry';
import { routeLlm } from './llm-router';
import { LlmMessage, LlmResponse } from './types';
import { kbSearch } from '@/lib/mcp/kb-mcp-client';
import { caseSimilar } from '@/lib/mcp/case-history-mcp-client';
import { callMcpTool } from '@/lib/mcp/mcp-gateway';
import { UserRole, AppPage } from '@/lib/mcp/tool-policy';
import { opencodeResearch } from './opencode-client';

interface BrainUser {
  id: string;
  username: string;
  role: string;
}

interface HistoryMessage {
  role: string;
  content: string;
}

interface RunActionParams {
  role: AppPromptRole;
  dbCaseId: string;
  caseId: string;
  sessionId: string;
  promptType: string;
  message?: string;
  additionalInfo?: string;
  history?: HistoryMessage[];
  user: BrainUser;
}

function formatHistory(history: HistoryMessage[] | undefined): string {
  if (!history || history.length === 0) return '';
  return history
    .slice(-12)
    .map((item) => `${item.role === 'user' ? 'User' : 'Assistant'}: ${item.content}`)
    .join('\n\n');
}

function getPageName(role: AppPromptRole): string {
  return role === 'noc' ? 'NOC' : 'Operation';
}

function getUserText(params: RunActionParams): string {
  const isFeedbackType = params.promptType === 'feedback' || params.promptType === 'draft-feedback';
  if (isFeedbackType) return params.additionalInfo || params.message || '';
  if (params.promptType === 'close') return `Close case ${params.caseId}`;
  return params.message || `Process ${params.promptType} request`;
}

function compactForFallback(text: string): string {
  const maxChars = 16_000;
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[Prompt truncated for local fallback]`;
}

async function searchKnowledgeBase(
  query: string,
  role: UserRole,
  page: AppPage,
  caseId: string
): Promise<string> {
  try {
    const result = await kbSearch(
      { query, limit: 5 },
      { role, page, caseId }
    );
    return result.success && result.output ? result.output : '';
  } catch (error) {
    console.error('[AI Brain] KB search failed:', error);
    return '';
  }
}

async function searchSimilarCases(
  text: string,
  role: UserRole,
  page: AppPage,
  caseId: string
): Promise<string> {
  try {
    const result = await caseSimilar(
      { text, limit: 3 },
      { role, page, caseId }
    );
    return result.success && result.output ? result.output : '';
  } catch (error) {
    console.error('[AI Brain] Case similarity search failed:', error);
    return '';
  }
}

async function inspectDockerReadOnly(userText: string, role: UserRole, page: AppPage, caseId: string): Promise<string> {
  if (page !== 'Operation' || (role !== 'admin' && role !== 'operation')) return '';

  const looksInfrastructureRelated = /container|docker|compose|nginx|app2|memory|cpu|log|502|timeout|service/i.test(userText);
  if (!looksInfrastructureRelated) return '';

  const results = await Promise.all([
    callMcpTool({ serverName: 'docker-mcp', toolName: 'compose_ps', input: {}, role, page, caseId }),
    callMcpTool({ serverName: 'docker-mcp', toolName: 'container_stats', input: { container: 'app2' }, role, page, caseId }),
  ]);

  return results
    .map((result, index) => {
      const name = index === 0 ? 'compose_ps' : 'container_stats app2';
      return result.success ? `${name}:\n${result.output}` : `${name}: unavailable (${result.error})`;
    })
    .join('\n\n');
}

export async function runChatAction(params: RunActionParams): Promise<LlmResponse> {
  const rolePrompt = await loadRolePrompt(params.role);
  const actionPrompt = await loadActionPrompt(params.role, params.promptType);
  const recentHistory = formatHistory(params.history);
  const userText = getUserText(params);

  // Call MCP tools to get context
  const userRole = params.user.role as UserRole;
  const page = getPageName(params.role) as AppPage;
  
  const [kbResults, caseResults] = await Promise.all([
    searchKnowledgeBase(userText, userRole, page, params.dbCaseId),
    searchSimilarCases(userText, userRole, page, params.dbCaseId),
  ]);

  let opencodeResults = '';
  let dockerResults = '';
  if (params.role === 'operation' && (params.promptType === 'research' || params.promptType === 'diagnose')) {
    const [ocResult, dockerResult] = await Promise.all([
      opencodeResearch(userText),
      inspectDockerReadOnly(userText, userRole, page, params.dbCaseId),
    ]);
    opencodeResults = ocResult.success ? ocResult.output : `OpenCode unavailable: ${ocResult.error}`;
    dockerResults = dockerResult;
  }

  const vars = {
    MESSAGE: params.message || '',
    FEEDBACK: params.additionalInfo || '',
    SESSION_ID: params.sessionId,
    CASE_ID: params.caseId,
    PAGE: getPageName(params.role),
    USER_ROLE: params.user.role,
    USERNAME: params.user.username,
    RECENT_HISTORY: recentHistory,
    KB_RESULTS: kbResults,
    CASE_RESULTS: caseResults,
  };

  const systemPrompt = interpolatePrompt(
    [
      rolePrompt,
      recentHistory ? `Recent conversation:\n${recentHistory}` : '',
      kbResults ? `Knowledge Base Results:\n${kbResults}` : '',
      caseResults ? `Similar Cases:\n${caseResults}` : '',
      opencodeResults ? `OpenCode Research Results:\n${opencodeResults}` : '',
      dockerResults ? `Docker Read-only Inspection:\n${dockerResults}` : '',
      actionPrompt,
    ]
      .filter(Boolean)
      .join('\n\n---\n\n'),
    vars,
  );

  const messages: LlmMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userText },
  ];

  const fallbackMessages: LlmMessage[] = [
    { role: 'system', content: compactForFallback(systemPrompt) },
    { role: 'user', content: userText },
  ];

  const response = await routeLlm({
    caseId: params.dbCaseId,
    messages,
    fallbackMessages,
    role: params.role,
  });

  if (response.content) {
    // Remove <think>...</think> blocks generated by reasoning models
    response.content = response.content.replace(/<think>[\s\S]*?<\/think>\s*/gi, '').trim();
  }

  return response;
}
