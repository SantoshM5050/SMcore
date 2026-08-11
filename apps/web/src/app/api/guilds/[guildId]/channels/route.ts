import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth';
import { DiscordApi } from '@/lib/discord';
import { AuditAction } from '@repo/database';
import { logDashboardAudit } from '@/lib/auditLogger';
import { z } from 'zod';

const channelConfigSchema = z.object({
  requestChannelId: z.string().nullable().optional(),
  reviewChannelId: z.string().nullable().optional(),
  logsChannelId: z.string().nullable().optional(),
  modLogChannelId: z.string().nullable().optional(),
  voiceLogsChannelId: z.string().nullable().optional(),
  messageLogsChannelId: z.string().nullable().optional(),
  generalLogsChannelId: z.string().nullable().optional(),
  alertLogsChannelId: z.string().nullable().optional(),
  commandLogsChannelId: z.string().nullable().optional(),
});

export async function GET(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;

  let discordChannels: any[] = [];
  try {
    discordChannels = await DiscordApi.getGuildChannels(guildId);
  } catch (err) {
    console.warn(`Could not fetch live Discord channels for guild ${guildId}:`, err);
  }

  const config = await prisma.channelConfiguration.findUnique({
    where: { guildId },
  });

  return NextResponse.json({
    config: config || {
      requestChannelId: null,
      reviewChannelId: null,
      logsChannelId: null,
      modLogChannelId: null,
      voiceLogsChannelId: null,
      messageLogsChannelId: null,
      generalLogsChannelId: null,
      alertLogsChannelId: null,
      commandLogsChannelId: null,
    },
    discordChannels,
  });
}

export async function POST(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;
  const body = await request.json().catch(() => ({}));
  const validation = channelConfigSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
  }

  const data = validation.data;

  const updatedConfig = await prisma.channelConfiguration.upsert({
    where: { guildId },
    update: {
      requestChannelId: data.requestChannelId,
      reviewChannelId: data.reviewChannelId,
      logsChannelId: data.logsChannelId,
      modLogChannelId: data.modLogChannelId,
      voiceLogsChannelId: data.voiceLogsChannelId,
      messageLogsChannelId: data.messageLogsChannelId,
      generalLogsChannelId: data.generalLogsChannelId,
      alertLogsChannelId: data.alertLogsChannelId,
      commandLogsChannelId: data.commandLogsChannelId,
    },
    create: {
      guildId,
      requestChannelId: data.requestChannelId,
      reviewChannelId: data.reviewChannelId,
      logsChannelId: data.logsChannelId,
      modLogChannelId: data.modLogChannelId,
      voiceLogsChannelId: data.voiceLogsChannelId,
      messageLogsChannelId: data.messageLogsChannelId,
      generalLogsChannelId: data.generalLogsChannelId,
      alertLogsChannelId: data.alertLogsChannelId,
      commandLogsChannelId: data.commandLogsChannelId,
    },
  });

  await logDashboardAudit(
    guildId,
    user.discordId,
    `${user.username}#${user.discriminator}`,
    AuditAction.CHANNEL_UPDATED,
    {
      requestChannelId: data.requestChannelId,
      reviewChannelId: data.reviewChannelId,
      logsChannelId: data.logsChannelId,
      modLogChannelId: data.modLogChannelId,
      voiceLogsChannelId: data.voiceLogsChannelId,
      messageLogsChannelId: data.messageLogsChannelId,
      generalLogsChannelId: data.generalLogsChannelId,
      alertLogsChannelId: data.alertLogsChannelId,
      commandLogsChannelId: data.commandLogsChannelId,
    }
  );

  return NextResponse.json(updatedConfig);
}
