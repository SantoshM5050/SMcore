import { NextResponse } from 'next/server';
import { prisma, AuditAction, StaffPermission, AutoModAction, RaidAction, JoinSecurityAction } from '@repo/database';
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

  const [
    rules,
    antiSpam,
    antiLink,
    antiInvite,
    antiMention,
    antiRaid,
    joinSecurity,
  ] = await Promise.all([
    prisma.autoModRule.findMany({ where: { guildId }, orderBy: { createdAt: 'desc' } }),
    prisma.antiSpamConfig.findUnique({ where: { guildId } }),
    prisma.antiLinkConfig.findUnique({ where: { guildId } }),
    prisma.antiInviteConfig.findUnique({ where: { guildId } }),
    prisma.antiMentionConfig.findUnique({ where: { guildId } }),
    prisma.antiRaidConfig.findUnique({ where: { guildId } }),
    prisma.joinSecurityConfig.findUnique({ where: { guildId } }),
  ]);

  return NextResponse.json({
    rules,
    antiSpam: antiSpam || {
      enabled: false,
      maxMessages: 5,
      timeWindowSeconds: 5,
      maxDuplicates: 3,
      action: AutoModAction.TIMEOUT,
      timeoutMinutes: 10,
      deleteMessages: true,
      exemptRoleIds: [],
      exemptChannelIds: [],
    },
    antiLink: antiLink || {
      enabled: false,
      blockAll: false,
      whitelistedDomains: [],
      blacklistedDomains: [],
      allowDiscordLinks: true,
      allowYouTube: true,
      allowTwitch: true,
      action: AutoModAction.DELETE,
      timeoutMinutes: 10,
      exemptRoleIds: [],
      exemptChannelIds: [],
    },
    antiInvite: antiInvite || {
      enabled: false,
      action: AutoModAction.DELETE,
      timeoutMinutes: 10,
      deleteMessage: true,
      exemptRoleIds: [],
      exemptChannelIds: [],
    },
    antiMention: antiMention || {
      enabled: false,
      maxUserMentions: 5,
      maxRoleMentions: 3,
      blockEveryone: true,
      blockHere: true,
      action: AutoModAction.TIMEOUT,
      timeoutMinutes: 10,
      exemptRoleIds: [],
      exemptChannelIds: [],
    },
    antiRaid: antiRaid || {
      enabled: false,
      joinThreshold: 10,
      windowSeconds: 10,
      action: RaidAction.LOCK_CHANNELS,
      lockChannelIds: [],
      alertChannelId: null,
      autoRaidMode: true,
    },
    joinSecurity: joinSecurity || {
      enabled: false,
      minAccountAgeDays: 3,
      blockDefaultAvatars: false,
      action: JoinSecurityAction.ALERT,
      quarantineRoleId: null,
    },
  });
}

export async function PUT(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;
  const hasPerm = await checkStaffPermission(guildId, user.discordId, StaffPermission.MANAGE_AUTOMOD);
  if (!hasPerm) {
    return NextResponse.json({ error: 'Missing MANAGE_AUTOMOD permission' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { antiSpam, antiLink, antiInvite, antiMention, antiRaid, joinSecurity } = body;

  const updates: any = {};

  if (antiSpam) {
    updates.antiSpam = await prisma.antiSpamConfig.upsert({
      where: { guildId },
      update: {
        enabled: antiSpam.enabled,
        maxMessages: antiSpam.maxMessages,
        timeWindowSeconds: antiSpam.timeWindowSeconds ?? antiSpam.intervalSeconds ?? 5,
        maxDuplicates: antiSpam.maxDuplicates ?? antiSpam.duplicateThreshold ?? 3,
        action: antiSpam.action,
        timeoutMinutes: antiSpam.timeoutMinutes ?? antiSpam.durationMinutes ?? 10,
        deleteMessages: antiSpam.deleteMessages ?? true,
      },
      create: {
        guildId,
        enabled: antiSpam.enabled ?? false,
        maxMessages: antiSpam.maxMessages ?? 5,
        timeWindowSeconds: antiSpam.timeWindowSeconds ?? antiSpam.intervalSeconds ?? 5,
        maxDuplicates: antiSpam.maxDuplicates ?? antiSpam.duplicateThreshold ?? 3,
        action: antiSpam.action ?? AutoModAction.TIMEOUT,
        timeoutMinutes: antiSpam.timeoutMinutes ?? antiSpam.durationMinutes ?? 10,
        deleteMessages: antiSpam.deleteMessages ?? true,
      },
    });
  }

  if (antiLink) {
    updates.antiLink = await prisma.antiLinkConfig.upsert({
      where: { guildId },
      update: {
        enabled: antiLink.enabled,
        blockAll: antiLink.blockAll ?? false,
        whitelistedDomains: Array.isArray(antiLink.whitelistedDomains) ? antiLink.whitelistedDomains : (antiLink.whitelist || []),
        blacklistedDomains: Array.isArray(antiLink.blacklistedDomains) ? antiLink.blacklistedDomains : (antiLink.blacklist || []),
        action: antiLink.action,
        timeoutMinutes: antiLink.timeoutMinutes ?? antiLink.durationMinutes ?? 10,
      },
      create: {
        guildId,
        enabled: antiLink.enabled ?? false,
        blockAll: antiLink.blockAll ?? false,
        whitelistedDomains: Array.isArray(antiLink.whitelistedDomains) ? antiLink.whitelistedDomains : (antiLink.whitelist || []),
        blacklistedDomains: Array.isArray(antiLink.blacklistedDomains) ? antiLink.blacklistedDomains : (antiLink.blacklist || []),
        action: antiLink.action ?? AutoModAction.DELETE,
        timeoutMinutes: antiLink.timeoutMinutes ?? antiLink.durationMinutes ?? 10,
      },
    });
  }

  if (antiInvite) {
    updates.antiInvite = await prisma.antiInviteConfig.upsert({
      where: { guildId },
      update: {
        enabled: antiInvite.enabled,
        action: antiInvite.action,
        timeoutMinutes: antiInvite.timeoutMinutes ?? antiInvite.durationMinutes ?? 10,
        deleteMessage: antiInvite.deleteMessage ?? true,
      },
      create: {
        guildId,
        enabled: antiInvite.enabled ?? false,
        action: antiInvite.action ?? AutoModAction.DELETE,
        timeoutMinutes: antiInvite.timeoutMinutes ?? antiInvite.durationMinutes ?? 10,
        deleteMessage: antiInvite.deleteMessage ?? true,
      },
    });
  }

  if (antiMention) {
    updates.antiMention = await prisma.antiMentionConfig.upsert({
      where: { guildId },
      update: {
        enabled: antiMention.enabled,
        maxUserMentions: antiMention.maxUserMentions ?? antiMention.maxMentions ?? 5,
        maxRoleMentions: antiMention.maxRoleMentions ?? 3,
        blockEveryone: antiMention.blockEveryone ?? true,
        blockHere: antiMention.blockHere ?? true,
        action: antiMention.action,
        timeoutMinutes: antiMention.timeoutMinutes ?? antiMention.durationMinutes ?? 10,
      },
      create: {
        guildId,
        enabled: antiMention.enabled ?? false,
        maxUserMentions: antiMention.maxUserMentions ?? antiMention.maxMentions ?? 5,
        maxRoleMentions: antiMention.maxRoleMentions ?? 3,
        blockEveryone: antiMention.blockEveryone ?? true,
        blockHere: antiMention.blockHere ?? true,
        action: antiMention.action ?? AutoModAction.TIMEOUT,
        timeoutMinutes: antiMention.timeoutMinutes ?? antiMention.durationMinutes ?? 10,
      },
    });
  }

  if (antiRaid) {
    updates.antiRaid = await prisma.antiRaidConfig.upsert({
      where: { guildId },
      update: {
        enabled: antiRaid.enabled,
        joinThreshold: antiRaid.joinThreshold,
        windowSeconds: antiRaid.windowSeconds,
        action: antiRaid.action,
        lockChannelIds: Array.isArray(antiRaid.lockChannelIds) ? antiRaid.lockChannelIds : [],
        alertChannelId: antiRaid.alertChannelId || null,
        autoRaidMode: antiRaid.autoRaidMode ?? true,
      },
      create: {
        guildId,
        enabled: antiRaid.enabled ?? false,
        joinThreshold: antiRaid.joinThreshold ?? 10,
        windowSeconds: antiRaid.windowSeconds ?? 10,
        action: antiRaid.action ?? RaidAction.LOCK_CHANNELS,
        lockChannelIds: Array.isArray(antiRaid.lockChannelIds) ? antiRaid.lockChannelIds : [],
        alertChannelId: antiRaid.alertChannelId || null,
        autoRaidMode: antiRaid.autoRaidMode ?? true,
      },
    });
  }

  if (joinSecurity) {
    updates.joinSecurity = await prisma.joinSecurityConfig.upsert({
      where: { guildId },
      update: {
        enabled: joinSecurity.enabled,
        minAccountAgeDays: joinSecurity.minAccountAgeDays,
        blockDefaultAvatars: joinSecurity.blockDefaultAvatars,
        action: joinSecurity.action,
        quarantineRoleId: joinSecurity.quarantineRoleId || null,
      },
      create: {
        guildId,
        enabled: joinSecurity.enabled ?? false,
        minAccountAgeDays: joinSecurity.minAccountAgeDays ?? 3,
        blockDefaultAvatars: joinSecurity.blockDefaultAvatars ?? false,
        action: joinSecurity.action ?? JoinSecurityAction.ALERT,
        quarantineRoleId: joinSecurity.quarantineRoleId || null,
      },
    });
  }

  await logDashboardAudit(
    guildId,
    user.discordId,
    `${user.username}#${user.discriminator}`,
    AuditAction.AUTOMOD_UPDATED,
    { updatedSections: Object.keys(updates) }
  );

  return NextResponse.json({ success: true, updates });
}
