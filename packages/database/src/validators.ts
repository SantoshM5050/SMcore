import { z } from 'zod';

export const banMemberSchema = z.object({
  targetId: z.string().min(1, 'Target ID is required'),
  reason: z.string().max(512).optional().default('No reason provided'),
  deleteMessageDays: z.number().int().min(0).max(7).optional().default(0),
  notifyUser: z.boolean().optional().default(true),
});

export const unbanMemberSchema = z.object({
  targetId: z.string().min(1, 'Target ID is required'),
  reason: z.string().max(512).optional().default('No reason provided'),
});

export const kickMemberSchema = z.object({
  targetId: z.string().min(1, 'Target ID is required'),
  reason: z.string().max(512).optional().default('No reason provided'),
  notifyUser: z.boolean().optional().default(true),
});

export const timeoutMemberSchema = z.object({
  targetId: z.string().min(1, 'Target ID is required'),
  durationMinutes: z.number().int().min(1).max(40320, 'Duration cannot exceed 28 days'),
  reason: z.string().max(512).optional().default('No reason provided'),
  notifyUser: z.boolean().optional().default(true),
});

export const warnMemberSchema = z.object({
  targetId: z.string().min(1, 'Target ID is required'),
  reason: z.string().min(1, 'Reason is required').max(512),
});

export const purgeMessagesSchema = z.object({
  channelId: z.string().min(1, 'Channel ID is required'),
  amount: z.number().int().min(1).max(100, 'Max 100 messages can be purged at once'),
  targetUserId: z.string().optional(),
  contains: z.string().max(256).optional(),
  botOnly: z.boolean().optional().default(false),
  reason: z.string().max(512).optional().default('Bulk message purge'),
});

export const channelLockSchema = z.object({
  channelId: z.string().min(1, 'Channel ID is required'),
  locked: z.boolean(),
  reason: z.string().max(512).optional().default('Channel lock/unlock'),
});

export const slowmodeSchema = z.object({
  channelId: z.string().min(1, 'Channel ID is required'),
  seconds: z.number().int().min(0).max(21600, 'Max slowmode is 6 hours (21600 seconds)'),
  reason: z.string().max(512).optional().default('Slowmode update'),
});

export const memberNoteSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  content: z.string().min(1, 'Note content is required').max(2000),
});

export const updateSettingsSchema = z.object({
  moderationEnabled: z.boolean().optional(),
  autoModEnabled: z.boolean().optional(),
  antiSpamEnabled: z.boolean().optional(),
  antiLinkEnabled: z.boolean().optional(),
  antiInviteEnabled: z.boolean().optional(),
  antiMentionEnabled: z.boolean().optional(),
  antiRaidEnabled: z.boolean().optional(),
  raidModeActive: z.boolean().optional(),
  muteRoleId: z.string().nullable().optional(),
  quarantineRoleId: z.string().nullable().optional(),
  modLogChannelId: z.string().nullable().optional(),
  alertChannelId: z.string().nullable().optional(),
  appealUrl: z.string().url().or(z.literal('')).nullable().optional(),
  dmOnPunish: z.boolean().optional(),
  timezone: z.string().optional(),
});

export const updateAntiSpamSchema = z.object({
  enabled: z.boolean(),
  maxMessages: z.number().int().min(2).max(50),
  timeWindowSeconds: z.number().int().min(1).max(60),
  maxDuplicates: z.number().int().min(2).max(20),
  action: z.enum(['DELETE', 'WARN', 'TIMEOUT', 'KICK', 'BAN', 'ALERT']),
  timeoutMinutes: z.number().int().min(1).max(10080),
  deleteMessages: z.boolean(),
  exemptRoleIds: z.array(z.string()).optional().default([]),
  exemptChannelIds: z.array(z.string()).optional().default([]),
});

export const updateAntiLinkSchema = z.object({
  enabled: z.boolean(),
  blockAll: z.boolean(),
  whitelistedDomains: z.array(z.string()).optional().default([]),
  blacklistedDomains: z.array(z.string()).optional().default([]),
  allowDiscordLinks: z.boolean(),
  allowYouTube: z.boolean(),
  allowTwitch: z.boolean(),
  action: z.enum(['DELETE', 'WARN', 'TIMEOUT', 'KICK', 'BAN', 'ALERT']),
  timeoutMinutes: z.number().int().min(1).max(10080),
  exemptRoleIds: z.array(z.string()).optional().default([]),
  exemptChannelIds: z.array(z.string()).optional().default([]),
});

export const updateAntiInviteSchema = z.object({
  enabled: z.boolean(),
  action: z.enum(['DELETE', 'WARN', 'TIMEOUT', 'KICK', 'BAN', 'ALERT']),
  timeoutMinutes: z.number().int().min(1).max(10080),
  deleteMessage: z.boolean(),
  exemptRoleIds: z.array(z.string()).optional().default([]),
  exemptChannelIds: z.array(z.string()).optional().default([]),
});

export const updateAntiMentionSchema = z.object({
  enabled: z.boolean(),
  maxUserMentions: z.number().int().min(1).max(50),
  maxRoleMentions: z.number().int().min(1).max(50),
  blockEveryone: z.boolean(),
  blockHere: z.boolean(),
  action: z.enum(['DELETE', 'WARN', 'TIMEOUT', 'KICK', 'BAN', 'ALERT']),
  timeoutMinutes: z.number().int().min(1).max(10080),
  exemptRoleIds: z.array(z.string()).optional().default([]),
  exemptChannelIds: z.array(z.string()).optional().default([]),
});

export const updateAntiRaidSchema = z.object({
  enabled: z.boolean(),
  joinThreshold: z.number().int().min(2).max(100),
  windowSeconds: z.number().int().min(2).max(120),
  action: z.enum(['LOCK_CHANNELS', 'ALERT_STAFF', 'QUARANTINE_NEW_JOINS']),
  lockChannelIds: z.array(z.string()).optional().default([]),
  alertChannelId: z.string().nullable().optional(),
  autoRaidMode: z.boolean(),
});

export const updateLogConfigSchema = z.object({
  category: z.enum(['MEMBER', 'MODERATION', 'VOICE', 'CHANNEL', 'ROLE', 'MESSAGE', 'SERVER']),
  enabled: z.boolean(),
  destinationType: z.enum(['TEXT_CHANNEL', 'FORUM_CHANNEL']),
  channelId: z.string().nullable().optional(),
  forumThreadMode: z.enum(['CATEGORY', 'DAILY', 'EVENT_TYPE', 'PER_CASE']),
  showIds: z.boolean(),
  showModerator: z.boolean(),
  showReason: z.boolean(),
  showChannel: z.boolean(),
  showTimestamp: z.boolean(),
  showBeforeAfter: z.boolean(),
  mentionUsers: z.boolean(),
  embedColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const staffRoleSchema = z.object({
  roleId: z.string().min(1, 'Role ID is required'),
  roleName: z.string().min(1, 'Role name is required'),
  permissions: z.array(
    z.enum([
      'VIEW_DASHBOARD',
      'VIEW_LOGS',
      'MANAGE_LOGS',
      'VIEW_MODERATION',
      'WARN_MEMBERS',
      'TIMEOUT_MEMBERS',
      'KICK_MEMBERS',
      'BAN_MEMBERS',
      'MANAGE_AUTOMOD',
      'MANAGE_ANTIRAID',
      'MANAGE_SETTINGS',
    ])
  ).min(1, 'At least one permission is required'),
});

export const warningEscalationSchema = z.object({
  warnCount: z.number().int().min(1).max(50),
  action: z.enum(['TIMEOUT', 'KICK', 'BAN']),
  durationMinutes: z.number().int().min(1).max(40320).optional(),
});
