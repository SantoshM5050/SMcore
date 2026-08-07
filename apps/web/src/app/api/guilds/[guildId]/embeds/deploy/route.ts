import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth';
import { AuditAction } from '@repo/database';
import { logDashboardAudit } from '@/lib/auditLogger';
import { z } from 'zod';

const deploySchema = z.object({
  channelId: z.string().min(1, 'Target channel ID is required'),
});

export async function POST(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;
  const body = await request.json().catch(() => ({}));
  const validation = deploySchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
  }

  const { channelId } = validation.data;

  // Save target channel in ChannelConfiguration
  await prisma.channelConfiguration.upsert({
    where: { guildId },
    update: { requestChannelId: channelId },
    create: { guildId, requestChannelId: channelId },
  });

  await logDashboardAudit(
    guildId,
    user.discordId,
    `${user.username}#${user.discriminator}`,
    AuditAction.PANEL_DEPLOYED,
    { channelId }
  );

  return NextResponse.json({
    success: true,
    message: `Panel deployment queued for channel ${channelId}. The Discord Bot will synchronize the panel layout immediately.`,
  });
}
