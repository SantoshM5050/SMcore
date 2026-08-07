import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const config = {
  token: process.env.DISCORD_BOT_TOKEN || '',
  clientId: process.env.DISCORD_CLIENT_ID || '',
  clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
  env: process.env.NODE_ENV || 'development',
};

if (!config.token) {
  console.warn('⚠️ Warning: DISCORD_BOT_TOKEN is not defined in environment variables.');
}
