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
    config: config || { requestChannelId: null, reviewChannelId: null, logsChannelId: null },
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
    },
    create: {
      guildId,
      requestChannelId: data.requestChannelId,
      reviewChannelId: data.reviewChannelId,
      logsChannelId: data.logsChannelId,
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
    }
  );

  return NextResponse.json(updatedConfig);
}
