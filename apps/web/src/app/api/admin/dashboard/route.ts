import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getPrisma } from '@/lib/db';
import { knowledgeService } from '@/lib/knowledge-service';
import { getSettings } from '@/lib/settings-service';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const prisma = getPrisma();
  await knowledgeService.init();

  const [totalCases, openCases, pendingCases, activeUsers, recentCases, settings] = await Promise.all([
    prisma.caseLog.count(),
    prisma.caseLog.count({ where: { status: 'OPEN' } }),
    prisma.caseLog.count({ where: { status: 'PENDING' } }),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.caseLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { messages: false },
    }),
    getSettings(),
  ]);
  const kb = knowledgeService.getStats();
  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(recentCases.map((item) => item.userId))] } },
    select: { id: true, username: true },
  });
  const usernames = new Map(users.map((user) => [user.id, user.username]));

  return NextResponse.json({
    stats: {
      totalCases,
      openCases,
      pendingCases,
      activeUsers,
      knowledgeEntries: kb.entries,
      aiConfigured: settings.OPENCODE_API_CONFIGURED,
    },
    integrations: {
      ai: settings.OPENCODE_API_CONFIGURED ? 'configured' : 'missing',
      knowledgeBase: kb.entries > 0 ? 'synced' : 'missing',
      outboundHook: settings.CASE_PUSH_ENDPOINT ? 'configured' : 'not_configured',
    },
    recentCases: recentCases.map((item) => ({
      id: item.id,
      type: item.role,
      user: usernames.get(item.userId) || item.userId,
      summary: item.summary,
      status: item.status,
      created: item.createdAt.toISOString(),
    })),
  });
}
