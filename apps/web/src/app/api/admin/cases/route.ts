import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getPrisma } from '@/lib/db';

export async function GET(req: Request) {
  const auth = await requireSession();
  if (auth.response) return auth.response;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'ALL';
  const status = searchParams.get('status') || 'ALL';
  const search = (searchParams.get('search') || '').trim();
  const prisma = getPrisma();

  const where: any = {};
  if (auth.user?.role !== 'ADMIN') where.role = auth.user?.role;
  if (type !== 'ALL') where.role = type;
  if (status !== 'ALL') where.status = status;
  if (search) {
    where.OR = [
      { id: { contains: search } },
      { summary: { contains: search } },
      { detail: { contains: search } },
      { userId: { contains: search } },
    ];
  }

  const cases = await prisma.caseLog.findMany({
    where,
    include: { messages: { orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const users = await prisma.user.findMany({
    select: { id: true, username: true },
    where: { id: { in: [...new Set(cases.map((c) => c.userId))] } },
  });
  const usernames = new Map(users.map((user) => [user.id, user.username]));

  return NextResponse.json({
    cases: cases.map((item) => ({
      id: item.id,
      type: item.role,
      user: usernames.get(item.userId) || item.userId,
      userId: item.userId,
      summary: item.summary,
      status: item.status,
      details: item.detail,
      category: item.category,
      confidence: item.confidence,
      created: item.createdAt.toISOString(),
      messages: item.messages,
    })),
  });
}
