export type UserRole = 'admin' | 'noc' | 'operation';
export type AppPage = 'NOC' | 'Operation';

export interface ToolPolicy {
  serverName: string;
  toolName: string;
  allowedRoles: UserRole[];
  allowedPages: AppPage[];
  maxOutputChars?: number;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const KB_SEARCH_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_OUTPUT_CHARS = 4_000;

export const TOOL_POLICIES: ToolPolicy[] = [
  // kb-mcp
  {
    serverName: 'kb-mcp',
    toolName: 'kb_search',
    allowedRoles: ['admin', 'noc', 'operation'],
    allowedPages: ['NOC', 'Operation'],
    timeoutMs: KB_SEARCH_TIMEOUT_MS,
    maxOutputChars: DEFAULT_MAX_OUTPUT_CHARS,
  },
  {
    serverName: 'kb-mcp',
    toolName: 'kb_read',
    allowedRoles: ['admin', 'noc', 'operation'],
    allowedPages: ['NOC', 'Operation'],
    maxOutputChars: DEFAULT_MAX_OUTPUT_CHARS,
  },
  {
    serverName: 'kb-mcp',
    toolName: 'style_guide_read',
    allowedRoles: ['admin', 'noc'],
    allowedPages: ['NOC'],
    maxOutputChars: DEFAULT_MAX_OUTPUT_CHARS,
  },
  {
    serverName: 'kb-mcp',
    toolName: 'template_read',
    allowedRoles: ['admin', 'noc', 'operation'],
    allowedPages: ['NOC', 'Operation'],
    maxOutputChars: DEFAULT_MAX_OUTPUT_CHARS,
  },

  // case-history-mcp
  {
    serverName: 'case-history-mcp',
    toolName: 'case_search',
    allowedRoles: ['admin', 'noc', 'operation'],
    allowedPages: ['NOC', 'Operation'],
    maxOutputChars: DEFAULT_MAX_OUTPUT_CHARS,
  },
  {
    serverName: 'case-history-mcp',
    toolName: 'case_read',
    allowedRoles: ['admin', 'noc', 'operation'],
    allowedPages: ['NOC', 'Operation'],
    maxOutputChars: DEFAULT_MAX_OUTPUT_CHARS,
  },
  {
    serverName: 'case-history-mcp',
    toolName: 'case_similar',
    allowedRoles: ['admin', 'noc', 'operation'],
    allowedPages: ['NOC', 'Operation'],
    maxOutputChars: DEFAULT_MAX_OUTPUT_CHARS,
  },

  // docker-mcp (read-only, Operation/Admin only)
  {
    serverName: 'docker-mcp',
    toolName: 'list_containers',
    allowedRoles: ['admin', 'operation'],
    allowedPages: ['Operation'],
    maxOutputChars: DEFAULT_MAX_OUTPUT_CHARS,
  },
  {
    serverName: 'docker-mcp',
    toolName: 'container_logs',
    allowedRoles: ['admin', 'operation'],
    allowedPages: ['Operation'],
    maxOutputChars: DEFAULT_MAX_OUTPUT_CHARS,
  },
  {
    serverName: 'docker-mcp',
    toolName: 'container_stats',
    allowedRoles: ['admin', 'operation'],
    allowedPages: ['Operation'],
    maxOutputChars: DEFAULT_MAX_OUTPUT_CHARS,
  },
  {
    serverName: 'docker-mcp',
    toolName: 'list_images',
    allowedRoles: ['admin'],
    allowedPages: ['Operation'],
    maxOutputChars: DEFAULT_MAX_OUTPUT_CHARS,
  },
  {
    serverName: 'docker-mcp',
    toolName: 'compose_ps',
    allowedRoles: ['admin', 'operation'],
    allowedPages: ['Operation'],
    maxOutputChars: DEFAULT_MAX_OUTPUT_CHARS,
  },
  {
    serverName: 'docker-mcp',
    toolName: 'docker_version',
    allowedRoles: ['admin', 'operation'],
    allowedPages: ['Operation'],
    maxOutputChars: DEFAULT_MAX_OUTPUT_CHARS,
  },

  // web-fetch-mcp (restricted domains)
  {
    serverName: 'web-fetch-mcp',
    toolName: 'web_fetch',
    allowedRoles: ['admin', 'noc', 'operation'],
    allowedPages: ['NOC', 'Operation'],
    maxOutputChars: DEFAULT_MAX_OUTPUT_CHARS,
  },

  // web-search-mcp (quota-limited)
  {
    serverName: 'web-search-mcp',
    toolName: 'web_search',
    allowedRoles: ['admin', 'noc', 'operation'],
    allowedPages: ['NOC', 'Operation'],
    maxOutputChars: DEFAULT_MAX_OUTPUT_CHARS,
  },
];

export function isToolAllowed(
  serverName: string,
  toolName: string,
  role: UserRole,
  page: AppPage
): ToolPolicy | null {
  const policy = TOOL_POLICIES.find(
    (p) => p.serverName === serverName && p.toolName === toolName
  );

  if (!policy) {
    return null;
  }

  if (!policy.allowedRoles.includes(role)) {
    return null;
  }

  if (!policy.allowedPages.includes(page)) {
    return null;
  }

  return policy;
}

export function getTimeoutMs(policy: ToolPolicy | null): number {
  return policy?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
}

export function getMaxOutputChars(policy: ToolPolicy | null): number {
  return policy?.maxOutputChars ?? DEFAULT_MAX_OUTPUT_CHARS;
}

export function getAllowedToolsForRole(role: UserRole, page: AppPage): string[] {
  return TOOL_POLICIES.filter(
    (p) => p.allowedRoles.includes(role) && p.allowedPages.includes(page)
  ).map((p) => `${p.serverName}/${p.toolName}`);
}
