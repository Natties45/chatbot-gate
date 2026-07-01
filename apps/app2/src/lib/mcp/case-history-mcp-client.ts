import { callMcpTool, McpToolResult } from './mcp-gateway';
import { UserRole, AppPage } from './tool-policy';

interface CaseSearchParams {
  query: string;
  page?: AppPage;
  status?: 'in_progress' | 'closed' | 'all';
  limit?: number;
}

interface CaseReadParams {
  caseId: string;
}

interface CaseSimilarParams {
  text: string;
  limit?: number;
}

interface CaseToolContext {
  role: UserRole;
  page: AppPage;
  caseId: string;
  messageId?: string;
}

export async function caseSearch(
  params: CaseSearchParams,
  context: CaseToolContext
): Promise<McpToolResult> {
  return callMcpTool({
    serverName: 'case-history-mcp',
    toolName: 'case_search',
    input: {
      query: params.query,
      page: params.page,
      status: params.status || 'all',
      limit: params.limit || 5,
    },
    role: context.role,
    page: context.page,
    caseId: context.caseId,
    messageId: context.messageId,
  });
}

export async function caseRead(
  params: CaseReadParams,
  context: CaseToolContext
): Promise<McpToolResult> {
  return callMcpTool({
    serverName: 'case-history-mcp',
    toolName: 'case_read',
    input: { caseId: params.caseId },
    role: context.role,
    page: context.page,
    caseId: context.caseId,
    messageId: context.messageId,
  });
}

export async function caseSimilar(
  params: CaseSimilarParams,
  context: CaseToolContext
): Promise<McpToolResult> {
  return callMcpTool({
    serverName: 'case-history-mcp',
    toolName: 'case_similar',
    input: {
      text: params.text,
      limit: params.limit || 3,
    },
    role: context.role,
    page: context.page,
    caseId: context.caseId,
    messageId: context.messageId,
  });
}
