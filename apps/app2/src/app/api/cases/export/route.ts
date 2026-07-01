import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../../lib/db';
import { requireAuth } from '../../../../lib/auth';
import { apiErrorResponse } from '../../../../lib/api-error';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(['admin', 'noc', 'operation']);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const pageFilter = searchParams.get('page');
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');
    const caseId = searchParams.get('caseId');

    const where: Prisma.CaseWhereInput = {};

    // 1. Role scoping
    if (user.role === 'noc') {
      where.page = 'NOC';
    } else if (user.role === 'operation') {
      where.page = 'Operation';
    } else if (pageFilter && pageFilter !== 'all') {
      where.page = pageFilter;
    }

    // 2. Filters
    if (status && status !== 'all') {
      where.status = status;
    }
    if (caseId) {
      where.caseId = { contains: caseId };
    }
    if (fromStr || toStr) {
      where.createdAt = {};
      if (fromStr) {
        where.createdAt.gte = new Date(`${fromStr}T00:00:00.000Z`);
      }
      if (toStr) {
        where.createdAt.lte = new Date(`${toStr}T23:59:59.999Z`);
      }
    }

    // Fetch all cases matching filters without pagination limits
    const cases = await prisma.case.findMany({
      where,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (cases.length === 0) {
      return new Response('No cases found matching the criteria.', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // Generate Markdown Content
    let markdown = `# chatbot-gate Case History Export\n\n`;
    markdown += `Generated on: ${new Date().toLocaleString('th-TH')}\n`;
    markdown += `Filtered range: ${fromStr || 'Anytime'} to ${toStr || 'Anytime'}\n`;
    markdown += `Total cases exported: ${cases.length}\n\n`;
    markdown += `* * *\n\n`;

    for (const c of cases) {
      markdown += `## Case ID: ${c.caseId}\n`;
      markdown += `- **Database ID**: ${c.id}\n`;
      markdown += `- **Created**: ${new Date(c.createdAt).toLocaleString('th-TH')}\n`;
      markdown += `- **Closed**: ${c.closedAt ? new Date(c.closedAt).toLocaleString('th-TH') : 'In Progress'}\n`;
      markdown += `- **Role**: ${c.userRole}\n`;
      markdown += `- **User**: ${c.username}\n`;
      markdown += `- **Module**: ${c.page}\n`;
      markdown += `- **Status**: ${c.status === 'closed' ? 'Closed' : 'In Progress'}\n\n`;

      if (c.status === 'closed') {
        markdown += `### Case Closure Summary\n`;
        markdown += `**Summary**:\n${c.summary || 'None'}\n\n`;
        markdown += `**Detail**:\n${c.detail || 'None'}\n\n`;
      }

      markdown += `### Chat Log\n\n`;
      for (const msg of c.messages) {
        const timestamp = new Date(msg.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const sender = msg.role === 'user' ? 'Customer/User' : 'Assistant';
        const kindLabel = msg.kind === 'draft' ? ' (Draft)' : '';
        markdown += `**[${timestamp}] ${sender}${kindLabel}**:\n${msg.content}\n\n`;
      }
      
      markdown += `* * *\n\n`;
    }

    // File naming
    let filename = '';
    if (fromStr && toStr && fromStr === toStr) {
      filename = `case-history-${fromStr}.md`;
    } else if (fromStr && toStr) {
      filename = `case-history-${fromStr}-to-${toStr}.md`;
    } else {
      filename = `case-history-export-${new Date().toISOString().split('T')[0]}.md`;
    }

    return new Response(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error, '[Cases Export API]');
  }
}
