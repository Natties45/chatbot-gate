import { getPrisma } from './db';

type AuditInput = {
  userId?: string;
  action: string;
  target?: string;
  status?: 'SUCCESS' | 'FAILURE';
  detail?: string;
  req?: Request;
};

export async function writeAuditLog(input: AuditInput) {
  try {
    const forwardedFor = input.req?.headers.get('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0]?.trim() || input.req?.headers.get('x-real-ip') || null;
    const userAgent = input.req?.headers.get('user-agent') || null;

    await getPrisma().auditLog.create({
      data: {
        userId: input.userId || 'anonymous',
        action: input.action,
        target: input.target,
        status: input.status || 'SUCCESS',
        ip,
        userAgent,
        detail: input.detail,
      },
    });
  } catch (error) {
    console.error('[Audit] Failed to write audit log:', error);
  }
}
