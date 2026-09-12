import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const config = {
  token: (process.env.DISCORD_BOT_TOKEN || '').trim().replace(/^["']|["']$/g, ''),
  clientId: (process.env.DISCORD_CLIENT_ID || '').trim().replace(/^["']|["']$/g, ''),
  clientSecret: (process.env.DISCORD_CLIENT_SECRET || '').trim().replace(/^["']|["']$/g, ''),
  env: process.env.NODE_ENV || 'development',
};

if (!config.token || config.token === 'YOUR_DISCORD_BOT_TOKEN') {
  console.warn('⚠️ Warning: DISCORD_BOT_TOKEN is not configured (missing or placeholder in .env). Please set your real Discord Bot Token in .env.');
}

