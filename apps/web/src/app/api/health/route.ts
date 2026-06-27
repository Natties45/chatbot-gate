import { NextResponse } from 'next/server';
import webPackageJson from '../../../../package.json';
import { getPrisma } from '@/lib/db';
import { knowledgeService } from '@/lib/knowledge-service';
import { getSettings } from '@/lib/settings-service';

export async function GET() {
  const startedAt = Date.now();

  try {
    const prisma = getPrisma();
    await knowledgeService.init();

    const [userCount, settingCount, caseCount, messageCount, settings] = await Promise.all([
      prisma.user.count(),
      prisma.setting.count(),
      prisma.caseLog.count(),
      prisma.chatMessage.count(),
      getSettings(),
    ]);
    const kb = knowledgeService.getStats();

    const checks = {
      database: 'ok',
      usersSeeded: userCount > 0 ? 'ok' : 'missing',
      settingsSeeded: settingCount > 0 ? 'ok' : 'missing',
      knowledgeBase: kb.entries > 0 ? 'ok' : 'missing',
      aiProvider: settings.OPENCODE_API_CONFIGURED ? 'configured' : 'missing',
    };
    const healthy = checks.database === 'ok' && checks.usersSeeded === 'ok' && checks.settingsSeeded === 'ok' && checks.knowledgeBase === 'ok';

    return NextResponse.json(
      {
        status: healthy ? 'ok' : 'degraded',
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
        app: {
          name: 'chatbot-gate',
          version: webPackageJson.version,
          webVersion: webPackageJson.version,
          next: webPackageJson.dependencies.next,
          nodeEnv: process.env.NODE_ENV || 'development',
        },
        checks,
        counts: {
          users: userCount,
          settings: settingCount,
          cases: caseCount,
          chatMessages: messageCount,
          knowledgeEntries: kb.entries,
        },
        knowledgeBase: {
          initialized: kb.initialized,
          path: kb.path,
        },
      },
      { status: healthy ? 200 : 503 },
    );
  } catch (error) {
    console.error('[Health] Failed health check:', error);
    return NextResponse.json(
      {
        status: 'error',
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
        checks: {
          database: 'error',
        },
      },
      { status: 503 },
    );
  }
}
