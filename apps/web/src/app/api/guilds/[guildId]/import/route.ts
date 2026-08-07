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
  const config = await request.json().catch(() => null);

  if (!config || !config.settings) {
    return NextResponse.json({ error: 'Invalid configuration payload' }, { status: 400 });
  }

  // Restore settings
  if (config.settings) {
    await prisma.guildSettings.upsert({
      where: { guildId },
      update: {
        cooldownMinutes: config.settings.cooldownMinutes,
        autoDmEnabled: config.settings.autoDmEnabled,
        loggingEnabled: config.settings.loggingEnabled,
        screenshotRequired: config.settings.screenshotRequired,
        screenshotAllowed: config.settings.screenshotAllowed,
        onePendingOnly: config.settings.onePendingOnly,
        defaultEmbedColor: config.settings.defaultEmbedColor,
        timezone: config.settings.timezone,
        language: config.settings.language,
      },
      create: { guildId, ...config.settings },
    });
  }

  // Restore channels
  if (config.channels) {
    await prisma.channelConfiguration.upsert({
      where: { guildId },
      update: {
        requestChannelId: config.channels.requestChannelId,
        reviewChannelId: config.channels.reviewChannelId,
        logsChannelId: config.channels.logsChannelId,
      },
      create: { guildId, ...config.channels },
    });
  }

  await logDashboardAudit(
    guildId,
    user.discordId,
    `${user.username}#${user.discriminator}`,
    AuditAction.SETTINGS_UPDATED,
    { action: 'import_server_configuration' }
  );

  return NextResponse.json({ success: true, message: 'Server configuration restored successfully!' });
}
