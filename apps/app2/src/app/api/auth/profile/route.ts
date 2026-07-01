import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../../lib/auth';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({
      id: user.id,
      username: user.username,
      role: user.role,
    });
  } catch (error) {
    console.error('[Auth Profile API]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
