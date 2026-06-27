import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPrisma } from '@/lib/db';

export async function GET() {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getPrisma().user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, username: true, role: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
}
