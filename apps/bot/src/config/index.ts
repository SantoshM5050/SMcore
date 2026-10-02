import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env from monorepo root or local directory
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  BOT_PORT: z.coerce.number().default(3001),
  
  // Discord Credentials
  DISCORD_BOT_TOKEN: z.string().min(1, 'DISCORD_BOT_TOKEN is required in .env'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required in .env'),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  
  // Privileged Intent Toggles (Allow disabling if unapproved on Discord Dev Portal)
  ENABLE_MESSAGE_CONTENT_INTENT: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .default('true'),
  ENABLE_GUILD_MEMBERS_INTENT: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .default('true'),

  // Storage Connections
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid Bot Configuration:', JSON.stringify(parsed.error.format(), null, 2));
  throw new Error('Invalid environment variables for SMCore bot.');
}

export const config = parsed.data;
export type Config = typeof config;
