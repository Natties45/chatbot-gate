import { prisma } from '@/lib/db';
import {
  isToolAllowed,
  getTimeoutMs,
  getMaxOutputChars,
  ToolPolicy,
  UserRole,
  AppPage,
  TOOL_POLICIES,
} from './tool-policy';

export interface McpToolCallParams {
  serverName: string;
  toolName: string;
  input: Record<string, unknown>;
  role: UserRole;
  page: AppPage;
  caseId: string;
  messageId?: string;
}

export interface McpToolResult {
  success: boolean;
  output?: string;
  error?: string;
  latencyMs: number;
}

interface McpServerConfig {
  url: string;
  timeoutMs?: number;
}

const MCP_SERVER_URLS: Record<string, string> = {
  'kb-mcp': process.env.MCP_KB_URL || 'http://localhost:4101',
  'case-history-mcp': process.env.MCP_CASE_HISTORY_URL || 'http://localhost:4102',
  'docker-mcp': process.env.MCP_DOCKER_URL || 'http://localhost:1234',
  'web-fetch-mcp': process.env.MCP_WEB_FETCH_URL || 'http://localhost:4103',
  'web-search-mcp': process.env.MCP_WEB_SEARCH_URL || 'http://localhost:4104',
};

function getMcpServerUrl(serverName: string): string | null {
  return MCP_SERVER_URLS[serverName] || null;
}

function truncateOutput(output: string, maxChars: number): string {
  if (output.length <= maxChars) {
    return output;
  }
  return `${output.slice(0, maxChars)}\n\n[Output truncated: ${output.length} chars total]`;
}

async function callMcpServer(
  serverUrl: string,
  toolName: string,
  input: Record<string, unknown>,
  timeoutMs: number
): Promise<{ output: string; error?: string }> {
  try {
    const response = await fetch(`${serverUrl}/tools/${toolName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MCP server returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    const output = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    return { output };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown MCP error';
    return { output: '', error: message };
  }
}

export async function callMcpTool(params: McpToolCallParams): Promise<McpToolResult> {
  const { serverName, toolName, input, role, page, caseId, messageId } = params;
  const startedAt = Date.now();

  // Check tool policy
  const policy = isToolAllowed(serverName, toolName, role, page);
  if (!policy) {
    const latencyMs = Date.now() - startedAt;
    await logToolCall({
      caseId,
      messageId,
      serverName,
      toolName,
      inputJson: JSON.stringify(input),
      outputText: null,
      status: 'denied',
      latencyMs,
    });

    return {
      success: false,
      error: `Tool ${serverName}/${toolName} is not allowed for role ${role} on page ${page}`,
      latencyMs,
    };
  }

  // Get server URL
  const serverUrl = getMcpServerUrl(serverName);
  if (!serverUrl) {
    const latencyMs = Date.now() - startedAt;
    await logToolCall({
      caseId,
      messageId,
      serverName,
      toolName,
      inputJson: JSON.stringify(input),
      outputText: null,
      status: 'error',
      latencyMs,
    });

    return {
      success: false,
      error: `MCP server ${serverName} is not configured`,
      latencyMs,
    };
  }

  // Call MCP server
  const timeoutMs = getTimeoutMs(policy);
  const maxOutputChars = getMaxOutputChars(policy);
  const { output, error } = await callMcpServer(serverUrl, toolName, input, timeoutMs);
  const latencyMs = Date.now() - startedAt;

  if (error) {
    const status = error.includes('timeout') || error.includes('Timeout') ? 'timeout' : 'error';
    await logToolCall({
      caseId,
      messageId,
      serverName,
      toolName,
      inputJson: JSON.stringify(input),
      outputText: error.slice(0, 500),
      status,
      latencyMs,
    });

    return {
      success: false,
      error,
      latencyMs,
    };
  }

  // Truncate output
  const truncatedOutput = truncateOutput(output, maxOutputChars);

  await logToolCall({
    caseId,
    messageId,
    serverName,
    toolName,
    inputJson: JSON.stringify(input),
    outputText: truncatedOutput,
    status: 'success',
    latencyMs,
  });

  return {
    success: true,
    output: truncatedOutput,
    latencyMs,
  };
}

async function logToolCall(params: {
  caseId: string;
  messageId?: string;
  serverName: string;
  toolName: string;
  inputJson: string | null;
  outputText: string | null;
  status: 'success' | 'error' | 'denied' | 'timeout';
  latencyMs: number;
}) {
  try {
    await prisma.toolCallLog.create({
      data: {
        caseId: params.caseId,
        messageId: params.messageId,
        serverName: params.serverName,
        toolName: params.toolName,
        inputJson: params.inputJson?.slice(0, 2000),
        outputText: params.outputText?.slice(0, 2000),
        status: params.status,
        latencyMs: params.latencyMs,
      },
    });
  } catch (error) {
    console.error('[MCP Gateway] Failed to write ToolCallLog:', error);
  }
}

export function getAvailableTools(role: UserRole, page: AppPage): string[] {
  const tools: string[] = [];

  for (const serverName of Object.keys(MCP_SERVER_URLS)) {
    const serverUrl = getMcpServerUrl(serverName);
    if (!serverUrl) continue;

    // Check if any tool from this server is allowed
    const hasAllowedTool = TOOL_POLICIES.some(
      (p) =>
        p.serverName === serverName &&
        p.allowedRoles.includes(role) &&
        p.allowedPages.includes(page)
    );

    if (hasAllowedTool) {
      tools.push(serverName);
    }
  }

  return tools;
}
