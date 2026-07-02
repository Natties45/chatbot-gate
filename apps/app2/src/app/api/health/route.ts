import { NextResponse } from 'next/server';
import packageJson from '../../../../package.json';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'ok',
      version: process.env.APP2_VERSION || packageJson.version,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Database unavailable',
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
