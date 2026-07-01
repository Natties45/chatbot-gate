import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/db';
import { requireAuth } from '../../../lib/auth';
import { apiErrorResponse } from '../../../lib/api-error';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(['admin', 'noc', 'operation']);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Case Details Endpoint: /api/cases?id=xxx
    if (id) {
      const dbCase = await prisma.case.findUnique({
        where: { id },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!dbCase) {
        return NextResponse.json({ error: 'Case not found' }, { status: 404 });
      }

      // Check role permissions
      if (user.role !== 'admin') {
        if (user.role === 'noc' && dbCase.page !== 'NOC') {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (user.role === 'operation' && dbCase.page !== 'Operation') {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      return NextResponse.json(dbCase);
    }

    // List Cases Endpoint: /api/cases?status=xxx&page=xxx&limit=20&cursor=xxx&from=xxx&to=xxx&caseId=xxx
    const status = searchParams.get('status'); // in_progress | closed | all
    const pageFilter = searchParams.get('page'); // NOC | Operation | all
    const fromStr = searchParams.get('from'); // YYYY-MM-DD
    const toStr = searchParams.get('to'); // YYYY-MM-DD
    const caseId = searchParams.get('caseId'); // e.g. 29066901
    const limit = parseInt(searchParams.get('limit') || '20');
    const cursor = searchParams.get('cursor');

    const where: Prisma.CaseWhereInput = {};

    // 1. Role-based scoping
    if (user.role === 'noc') {
      where.page = 'NOC';
    } else if (user.role === 'operation') {
      where.page = 'Operation';
    } else if (pageFilter && pageFilter !== 'all') {
      where.page = pageFilter;
    }

    // 2. Status filtering
    if (status && status !== 'all') {
      where.status = status;
    }

    // 3. Search by Case ID
    if (caseId) {
      where.caseId = { contains: caseId };
    }

    // 4. Date filtering
    if (fromStr || toStr) {
      where.createdAt = {};
      if (fromStr) {
        where.createdAt.gte = new Date(`${fromStr}T00:00:00.000Z`);
      }
      if (toStr) {
        where.createdAt.lte = new Date(`${toStr}T23:59:59.999Z`);
      }
    }

    // Query cases using Prisma
    const cases = await prisma.case.findMany({
      where,
      take: limit + 1, // Fetch one extra row to check if next page exists
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0, // Skip cursor item itself
      orderBy: { createdAt: 'desc' },
    });

    let nextCursor: string | null = null;
    if (cases.length > limit) {
      const nextItem = cases.pop(); // Remove the extra item
      nextCursor = nextItem?.id || null;
    }

    return NextResponse.json({
      cases,
      nextCursor,
    });
  } catch (error) {
    return apiErrorResponse(error, '[Cases API GET]');
  }
}
