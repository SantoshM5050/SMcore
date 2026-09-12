import { z } from 'zod';

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
  modLogChannelId: z.string().regex(/^\d{17,20}$/, 'Invalid Discord channel ID').nullable().optional(),
  actionLogChannelId: z.string().regex(/^\d{17,20}$/, 'Invalid Discord channel ID').nullable().optional(),
  muteRoleId: z.string().regex(/^\d{17,20}$/, 'Invalid Discord role ID').nullable().optional(),
  appealUrl: z.string().url().nullable().optional(),
});

export type GuildSettingsUpdateInput = z.infer<typeof GuildSettingsUpdateSchema>;
