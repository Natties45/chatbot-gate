import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { knowledgeService } from '@/lib/knowledge-service';
import { getSettings } from '@/lib/settings-service';
import { writeAuditLog } from '@/lib/audit-service';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const settings = await getSettings();
  return NextResponse.json({
    repoUrl: settings.KB_REPO_URL,
    model: settings.AI_MODEL,
    apiConfigured: settings.OPENCODE_API_CONFIGURED,
    lastSynced: null,
    logs: ['Knowledge base is mounted and will be scanned on demand.'],
  });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  await knowledgeService.reload();
  const stats = knowledgeService.getStats();
  const now = new Date().toISOString();
  await writeAuditLog({
    userId: auth.user?.id,
    action: 'ADMIN_KB_SYNC',
    target: stats.path || 'knowledge-base',
    detail: `entries=${stats.entries}`,
    req,
  });

  return NextResponse.json({
    lastSynced: now,
    logs: [
      `[${now}] Starting knowledge base scan...`,
      `[${now}] Loaded ${stats.entries} knowledge entries from ${stats.path || 'no path found'}.`,
      `[${now}] Sync complete.`,
    ],
    stats,
  });
}
