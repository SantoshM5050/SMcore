import { NextResponse } from 'next/server';
import { prisma, AuditAction, StaffPermission } from '@repo/database';
import { AuthService } from '@/lib/auth';
import { logDashboardAudit } from '@/lib/auditLogger';
import { checkStaffPermission } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  const where: any = { guildId };
  if (userId) where.userId = userId;

  const warnings = await prisma.warning.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return NextResponse.json(warnings);
}

export async function DELETE(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;
  const hasPerm = await checkStaffPermission(guildId, user.discordId, StaffPermission.WARN_MEMBERS);
  if (!hasPerm) {
    return NextResponse.json({ error: 'Missing WARN_MEMBERS permission' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const warningId = searchParams.get('id');
  const userId = searchParams.get('userId');

  if (warningId) {
    const updated = await prisma.warning.update({
      where: { id: warningId },
      data: { isActive: false },
    });

    await logDashboardAudit(
      guildId,
      user.discordId,
      `${user.username}#${user.discriminator}`,
      AuditAction.WARNING_REMOVED,
      { warningId, userId: updated.userId }
    );

    return NextResponse.json(updated);
  } else if (userId) {
    // Clear all active warnings for a user
    const batch = await prisma.warning.updateMany({
      where: { guildId, userId, isActive: true },
      data: { isActive: false },
    });

    await logDashboardAudit(
      guildId,
      user.discordId,
      `${user.username}#${user.discriminator}`,
      AuditAction.WARNING_REMOVED,
      { userId, clearedCount: batch.count }
    );

    return NextResponse.json({ clearedCount: batch.count });
  }

  return NextResponse.json({ error: 'Missing warning id or userId' }, { status: 400 });
}
