import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth';
import { AuditAction } from '@repo/database';
import { logDashboardAudit } from '@/lib/auditLogger';

export async function POST(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;

  const existing = await prisma.embedConfig.findFirst({
    where: { guildId },
  });

  if (existing) {
    await prisma.embedConfig.update({
      where: { id: existing.id },
      data: {
        messageId: null,
        channelId: null,
      },
    });
  }

  await logDashboardAudit(
    guildId,
    user.discordId,
    `${user.username}#${user.discriminator}`,
    AuditAction.PANEL_DELETED,
    { action: 'delete_panel_message' }
  );

  return NextResponse.json({
    success: true,
    message: 'Panel configuration unlinked and marked for deletion.',
  });
}
