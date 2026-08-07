import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth';
import { AuditAction } from '@repo/database';
import { logDashboardAudit } from '@/lib/auditLogger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

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

  // Get or create EmbedConfig
  let config = await prisma.embedConfig.findFirst({
    where: { guildId },
  });

  if (!config) {
    config = await prisma.embedConfig.create({
      data: {
        guildId,
        title: '🎮 Gaming Role Verification Request',
        description: 'Click below to apply for official rank roles! Select your target role and fill out your in-game credentials.',
        footerText: 'Powered by Nexus',
        colorHex: '#5865F2',
        buttonLabel: 'Apply for Role',
        buttonEmoji: '🎮',
      },
    });
  }

  // Deploy Embed to Discord Channel using Discord REST API
  const rawToken = process.env.DISCORD_BOT_TOKEN || '';
  const botToken = rawToken.trim().replace(/^["']|["']$/g, '');

  if (!botToken || botToken === 'YOUR_DISCORD_BOT_TOKEN') {
    return NextResponse.json({ error: 'DISCORD_BOT_TOKEN is missing or invalid in .env' }, { status: 500 });
  }

  const hexColor = (config.colorHex || '#5865F2').replace('#', '');
  const colorInt = parseInt(hexColor, 16) || 0x5865f2;

  const embedPayload = {
    title: config.title || '🎮 Gaming Role Verification Request',
    description: config.description || 'Click below to apply for official rank roles!',
    color: colorInt,
    footer: config.footerText ? { text: config.footerText, icon_url: config.footerIconUrl || undefined } : undefined,
    thumbnail: config.thumbnailUrl ? { url: config.thumbnailUrl } : undefined,
    image: config.imageUrl ? { url: config.imageUrl } : undefined,
  };

  const componentPayload = [
    {
      type: 1, // ActionRow
      components: [
        {
          type: 2, // Button
          custom_id: 'role_request_apply_btn',
          label: config.buttonLabel || 'Apply for Role',
          style: 1, // Primary (Blurple)
          emoji: config.buttonEmoji ? { name: config.buttonEmoji } : undefined,
        },
      ],
    },
  ];

  let deployedMessageId: string | null = null;
  let deployError: string | null = null;

  try {
    // Check if updating existing message or sending new one
    let targetUrl = `https://discord.com/api/v10/channels/${channelId}/messages`;
    let httpMethod = 'POST';

    if (config.messageId && config.channelId === channelId) {
      targetUrl = `https://discord.com/api/v10/channels/${channelId}/messages/${config.messageId}`;
      httpMethod = 'PATCH';
    }

    let discordRes = await fetch(targetUrl, {
      method: httpMethod,
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embedPayload],
        components: componentPayload,
      }),
    });

    // If PATCH failed (e.g. message was deleted), fallback to POST new message
    if (!discordRes.ok && httpMethod === 'PATCH') {
      discordRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [embedPayload],
          components: componentPayload,
        }),
      });
    }

    if (discordRes.ok) {
      const msgData = await discordRes.json();
      deployedMessageId = msgData.id;

      await prisma.embedConfig.update({
        where: { id: config.id },
        data: {
          channelId,
          messageId: msgData.id,
        },
      });
    } else {
      const errText = await discordRes.text();
      console.error(`[Deploy API] Failed to send embed to channel ${channelId}:`, errText);
      deployError = `Discord API returned ${discordRes.status}: ${errText}`;
    }
  } catch (err: any) {
    console.error(`[Deploy API] Error deploying embed:`, err);
    deployError = err.message || 'Unknown network error';
  }

  await logDashboardAudit(
    guildId,
    user.discordId,
    `${user.username}#${user.discriminator}`,
    AuditAction.PANEL_DEPLOYED,
    { channelId, messageId: deployedMessageId }
  );

  if (deployError) {
    return NextResponse.json(
      {
        success: false,
        error: `Could not send embed to Discord channel. Error: ${deployError}. Please verify that Nexus Bot is in your server and has "Send Messages" permission in channel #${channelId}.`,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Embed application panel successfully deployed to Discord channel #${channelId}!`,
  });
}
