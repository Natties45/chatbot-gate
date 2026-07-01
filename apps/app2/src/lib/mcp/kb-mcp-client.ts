import { callMcpTool, McpToolResult } from './mcp-gateway';
import { UserRole, AppPage } from './tool-policy';

interface KbSearchParams {
  query: string;
  category?: string;
  limit?: number;
}

interface KbReadParams {
  path: string;
}

interface StyleGuideReadParams {
  name: string;
}

interface TemplateReadParams {
  name: string;
}

interface KbToolContext {
  role: UserRole;
  page: AppPage;
  caseId: string;
  messageId?: string;
}

export async function kbSearch(
  params: KbSearchParams,
  context: KbToolContext
): Promise<McpToolResult> {
  return callMcpTool({
    serverName: 'kb-mcp',
    toolName: 'kb_search',
    input: {
      query: params.query,
      category: params.category,
      limit: params.limit || 5,
    },
    role: context.role,
    page: context.page,
    caseId: context.caseId,
    messageId: context.messageId,
  });
}

export async function kbRead(
  params: KbReadParams,
  context: KbToolContext
): Promise<McpToolResult> {
  return callMcpTool({
    serverName: 'kb-mcp',
    toolName: 'kb_read',
    input: { path: params.path },
    role: context.role,
    page: context.page,
    caseId: context.caseId,
    messageId: context.messageId,
  });
}

export async function styleGuideRead(
  params: StyleGuideReadParams,
  context: KbToolContext
): Promise<McpToolResult> {
  return callMcpTool({
    serverName: 'kb-mcp',
    toolName: 'style_guide_read',
    input: { name: params.name },
    role: context.role,
    page: context.page,
    caseId: context.caseId,
    messageId: context.messageId,
  });
}

export async function templateRead(
  params: TemplateReadParams,
  context: KbToolContext
): Promise<McpToolResult> {
  return callMcpTool({
    serverName: 'kb-mcp',
    toolName: 'template_read',
    input: { name: params.name },
    role: context.role,
    page: context.page,
    caseId: context.caseId,
    messageId: context.messageId,
  });
}
