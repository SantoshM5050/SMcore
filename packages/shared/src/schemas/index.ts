import { z } from 'zod';
import {
  ModerationAction,
  CaseStatus,
  WarningStatus,
  ProtectionType,
  AutoModPunishment,
  SecurityRiskLevel,
  SecurityAction,
  SecurityEventType,
} from '../enums';

export const SnowflakeSchema = z
  .string()
  .regex(/^\d{17,20}$/, 'Invalid Discord snowflake ID');

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  search: z.string().trim().optional(),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const GuildSettingsUpdateSchema = z.object({
  prefix: z.string().min(1).max(5).optional(),
  language: z.string().min(2).max(10).default('en-US'),
  timezone: z.string().default('UTC'),
  modLogChannelId: SnowflakeSchema.nullable().optional(),
  actionLogChannelId: SnowflakeSchema.nullable().optional(),
  muteRoleId: SnowflakeSchema.nullable().optional(),
  appealUrl: z.string().url().nullable().optional(),
});

export type GuildSettingsUpdateInput = z.infer<typeof GuildSettingsUpdateSchema>;

// Phase 1 Moderation Action Schemas

export const BanInputSchema = z.object({
  targetUserId: SnowflakeSchema,
  reason: z.string().trim().max(500, 'Reason must not exceed 500 characters').optional(),
  deleteMessageSeconds: z
    .number()
    .int()
    .min(0)
    .max(604800, 'Message deletion cannot exceed 7 days (604,800 seconds)')
    .default(0),
});
export type BanInput = z.infer<typeof BanInputSchema>;

export const UnbanInputSchema = z.object({
  targetUserId: SnowflakeSchema,
  reason: z.string().trim().max(500).optional(),
});
export type UnbanInput = z.infer<typeof UnbanInputSchema>;

export const KickInputSchema = z.object({
  targetUserId: SnowflakeSchema,
  reason: z.string().trim().max(500).optional(),
});
export type KickInput = z.infer<typeof KickInputSchema>;

export const TimeoutInputSchema = z.object({
  targetUserId: SnowflakeSchema,
  durationSeconds: z
    .number()
    .int()
    .min(1, 'Duration must be at least 1 second')
    .max(2419200, 'Timeout duration cannot exceed 28 days (2,419,200 seconds)'),
  reason: z.string().trim().max(500).optional(),
});
export type TimeoutInput = z.infer<typeof TimeoutInputSchema>;

export const UntimeoutInputSchema = z.object({
  targetUserId: SnowflakeSchema,
  reason: z.string().trim().max(500).optional(),
});
export type UntimeoutInput = z.infer<typeof UntimeoutInputSchema>;

export const WarnInputSchema = z.object({
  targetUserId: SnowflakeSchema,
  reason: z.string().trim().min(1, 'A reason is required to issue a warning').max(500),
});
export type WarnInput = z.infer<typeof WarnInputSchema>;

export const PurgeInputSchema = z.object({
  channelId: SnowflakeSchema,
  amount: z
    .number()
    .int()
    .min(1, 'Amount must be at least 1')
    .max(100, 'Purge cannot exceed 100 messages at once'),
  targetUserId: SnowflakeSchema.optional(),
});
export type PurgeInput = z.infer<typeof PurgeInputSchema>;

export const LockInputSchema = z.object({
  channelId: SnowflakeSchema,
  reason: z.string().trim().max(500).optional(),
});
export type LockInput = z.infer<typeof LockInputSchema>;

export const UnlockInputSchema = z.object({
  channelId: SnowflakeSchema,
  reason: z.string().trim().max(500).optional(),
});
export type UnlockInput = z.infer<typeof UnlockInputSchema>;

export const SlowmodeInputSchema = z.object({
  channelId: SnowflakeSchema,
  seconds: z
    .number()
    .int()
    .min(0)
    .max(21600, 'Slowmode cannot exceed 6 hours (21,600 seconds)'),
  reason: z.string().trim().max(500).optional(),
});
export type SlowmodeInput = z.infer<typeof SlowmodeInputSchema>;

export const NicknameInputSchema = z.object({
  targetUserId: SnowflakeSchema,
  nickname: z
    .string()
    .trim()
    .max(32, 'Nickname cannot exceed 32 characters')
    .nullable()
    .optional(),
  reason: z.string().trim().max(500).optional(),
});
export type NicknameInput = z.infer<typeof NicknameInputSchema>;

export const MemberNoteInputSchema = z.object({
  targetUserId: SnowflakeSchema,
  content: z
    .string()
    .trim()
    .min(1, 'Note content cannot be empty')
    .max(2000, 'Note content cannot exceed 2,000 characters'),
});
export type MemberNoteInput = z.infer<typeof MemberNoteInputSchema>;

export const WarningEscalationRuleSchema = z.object({
  warningCount: z.number().int().min(1).max(50),
  action: z.nativeEnum(ModerationAction),
  durationSeconds: z.number().int().positive().max(2419200).optional(),
  enabled: z.boolean().default(true),
});
export type WarningEscalationRuleInput = z.infer<typeof WarningEscalationRuleSchema>;

export const CaseFilterSchema = PaginationQuerySchema.extend({
  targetUserId: SnowflakeSchema.optional(),
  moderatorUserId: SnowflakeSchema.optional(),
  type: z.nativeEnum(ModerationAction).optional(),
  status: z.nativeEnum(CaseStatus).optional(),
});
export type CaseFilter = z.infer<typeof CaseFilterSchema>;

// Phase 2 AutoMod & Protection Shield Schemas

export const AutoModPunishmentSchema = z.nativeEnum(AutoModPunishment);

export const AntiSpamConfigSchema = z.object({
  enabled: z.boolean().default(false),
  messageLimit: z.number().int().min(2).max(30).default(5),
  windowSeconds: z.number().int().min(1).max(60).default(5),
  duplicateMessageLimit: z.number().int().min(2).max(10).default(3),
  punishment: AutoModPunishmentSchema.default(AutoModPunishment.TIMEOUT),
});
export type AntiSpamConfig = z.infer<typeof AntiSpamConfigSchema>;

export const MassMentionConfigSchema = z.object({
  enabled: z.boolean().default(false),
  maxUserMentions: z.number().int().min(1).max(50).default(5),
  maxRoleMentions: z.number().int().min(0).max(20).default(3),
  maxTotalMentions: z.number().int().min(1).max(60).default(6),
  everyoneMentionAllowed: z.boolean().default(false),
  punishment: AutoModPunishmentSchema.default(AutoModPunishment.TIMEOUT),
});
export type MassMentionConfig = z.infer<typeof MassMentionConfigSchema>;

export const InviteFilterConfigSchema = z.object({
  enabled: z.boolean().default(false),
  allowedInviteGuilds: z.array(z.string().trim()).default([]),
  punishment: AutoModPunishmentSchema.default(AutoModPunishment.DELETE),
});
export type InviteFilterConfig = z.infer<typeof InviteFilterConfigSchema>;

export const ExternalLinkConfigSchema = z.object({
  enabled: z.boolean().default(false),
  allowedDomains: z.array(z.string().trim().toLowerCase()).default([]),
  blockedDomains: z.array(z.string().trim().toLowerCase()).default([]),
  punishment: AutoModPunishmentSchema.default(AutoModPunishment.DELETE),
});
export type ExternalLinkConfig = z.infer<typeof ExternalLinkConfigSchema>;

export const KeywordFilterConfigSchema = z.object({
  enabled: z.boolean().default(false),
  prohibitedKeywords: z.array(z.string().trim().min(1).max(100)).max(500).default([]),
  punishment: AutoModPunishmentSchema.default(AutoModPunishment.DELETE),
});
export type KeywordFilterConfig = z.infer<typeof KeywordFilterConfigSchema>;

export const GuildProtectionSettingsSchema = z.object({
  guildId: SnowflakeSchema,
  antiSpamEnabled: z.boolean().default(false),
  antiSpamMessageLimit: z.number().int().min(2).max(30).default(5),
  antiSpamWindowSeconds: z.number().int().min(1).max(60).default(5),
  duplicateMessageLimit: z.number().int().min(2).max(10).default(3),
  antiSpamPunishment: AutoModPunishmentSchema.default(AutoModPunishment.TIMEOUT),

  massMentionEnabled: z.boolean().default(false),
  maxUserMentions: z.number().int().min(1).max(50).default(5),
  maxRoleMentions: z.number().int().min(0).max(20).default(3),
  maxTotalMentions: z.number().int().min(1).max(60).default(6),
  everyoneMentionAllowed: z.boolean().default(false),
  massMentionPunishment: AutoModPunishmentSchema.default(AutoModPunishment.TIMEOUT),

  inviteFilterEnabled: z.boolean().default(false),
  allowedInviteGuilds: z.array(z.string().trim()).default([]),
  inviteFilterPunishment: AutoModPunishmentSchema.default(AutoModPunishment.DELETE),

  externalLinkFilterEnabled: z.boolean().default(false),
  allowedDomains: z.array(z.string().trim().toLowerCase()).default([]),
  blockedDomains: z.array(z.string().trim().toLowerCase()).default([]),
  externalLinkPunishment: AutoModPunishmentSchema.default(AutoModPunishment.DELETE),

  keywordFilterEnabled: z.boolean().default(false),
  prohibitedKeywords: z.array(z.string().trim().min(1).max(100)).max(500).default([]),
  keywordPunishment: AutoModPunishmentSchema.default(AutoModPunishment.DELETE),

  deleteViolatingMessages: z.boolean().default(true),
});
export type GuildProtectionSettings = z.infer<typeof GuildProtectionSettingsSchema>;

export const GuildProtectionSettingsUpdateSchema = GuildProtectionSettingsSchema.omit({
  guildId: true,
}).partial();
export type GuildProtectionSettingsUpdate = z.infer<typeof GuildProtectionSettingsUpdateSchema>;

// Phase 3 Advanced Security & Anti-Raid Schemas

export const SecurityActionSchema = z.nativeEnum(SecurityAction);
export const SecurityRiskLevelSchema = z.nativeEnum(SecurityRiskLevel);
export const SecurityEventTypeSchema = z.nativeEnum(SecurityEventType);

export const GuildSecuritySettingsSchema = z.object({
  guildId: SnowflakeSchema,
  enabled: z.boolean().default(false),

  // Raid Detection & Raid Mode
  raidDetectionEnabled: z.boolean().default(false),
  raidJoinThreshold: z.number().int().min(2).max(100).default(10),
  raidWindowSeconds: z.number().int().min(5).max(300).default(10),
  raidModeDurationSeconds: z.number().int().min(60).max(86400).default(300),
  raidAction: SecurityActionSchema.default(SecurityAction.QUARANTINE),

  // Suspicious & Young Account Protection
  accountAgeProtectionEnabled: z.boolean().default(false),
  minimumAccountAgeHours: z.number().int().min(1).max(720).default(24),
  accountAgeAction: SecurityActionSchema.default(SecurityAction.QUARANTINE),

  // Role Quarantine Configuration
  quarantineEnabled: z.boolean().default(false),
  quarantineRoleId: SnowflakeSchema.nullable().optional(),
  removeRolesOnQuarantine: z.boolean().default(false),
  restoreRolesOnRelease: z.boolean().default(false),
});
export type GuildSecuritySettings = z.infer<typeof GuildSecuritySettingsSchema>;

export const GuildSecuritySettingsUpdateSchema = GuildSecuritySettingsSchema.omit({
  guildId: true,
}).partial();
export type GuildSecuritySettingsUpdate = z.infer<typeof GuildSecuritySettingsUpdateSchema>;
