import { z } from 'zod';
import { ModerationAction, CaseStatus, WarningStatus } from '../enums';

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
