import { prisma, AuditAction } from '@repo/database';

export async function logDashboardAudit(
  guildId: string,
  userId: string,
  userTag: string,
  action: AuditAction,
  details: Record<string, any>,
  ipAddress?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        guildId,
        userId,
        userTag,
        action,
        details,
        ipAddress: ipAddress || '127.0.0.1',
      },
    });
  } catch (error) {
    console.error('Failed to log dashboard audit event:', error);
  }
}
