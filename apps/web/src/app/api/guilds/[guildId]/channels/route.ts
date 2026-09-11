import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { DiscordApi } from '@/lib/discord';
import { AuditAction, StaffPermission } from '@repo/database';
import { logDashboardAudit } from '@/lib/auditLogger';
import { checkStaffPermission } from '@/lib/rbac';
import { z } from 'zod';

const channelActionSchema = z.object({
  action: z.enum(['LOCK', 'UNLOCK', 'SLOWMODE', 'PURGE']),
  channelId: z.string().min(1),
  slowmodeSeconds: z.number().int().min(0).max(21600).optional(),
  purgeCount: z.number().int().min(1).max(100).optional(),
});

export async function GET(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;

  try {
    const channels = await DiscordApi.getGuildChannels(guildId);
    return NextResponse.json(channels);
  } catch (err: any) {
    console.warn(`Could not fetch live Discord channels for guild ${guildId}:`, err);
    return NextResponse.json({ error: 'Failed to fetch channels from Discord' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;
  const body = await request.json().catch(() => ({}));
  const validation = channelActionSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
  }

  const data = validation.data;

  // RBAC check
  const hasPerm = await checkStaffPermission(guildId, user.discordId, StaffPermission.MANAGE_SETTINGS);
  if (!hasPerm) {
    return NextResponse.json({ error: 'Missing MANAGE_SETTINGS permission' }, { status: 403 });
  }

  try {
    if (data.action === 'LOCK') {
      await DiscordApi.setChannelLock(data.channelId, guildId, true);
    } else if (data.action === 'UNLOCK') {
      await DiscordApi.setChannelLock(data.channelId, guildId, false);
    } else if (data.action === 'SLOWMODE') {
      await DiscordApi.setSlowmode(data.channelId, data.slowmodeSeconds ?? 0);
    } else if (data.action === 'PURGE') {
      const deleted = await DiscordApi.purgeMessages(data.channelId, data.purgeCount ?? 10);
      return NextResponse.json({ success: true, count: deleted });
    }

    await logDashboardAudit(
      guildId,
      user.discordId,
      `${user.username}#${user.discriminator}`,
      AuditAction.SETTINGS_UPDATED,
      {
        channelId: data.channelId,
        action: data.action,
        slowmodeSeconds: data.slowmodeSeconds,
        purgeCount: data.purgeCount,
      }
    );

    return NextResponse.json({ success: true, action: data.action });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Action failed' }, { status: 500 });
  }
}
