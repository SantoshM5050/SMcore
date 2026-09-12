import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { config } from '../config';
import { logger } from '../utils/logger';

export function createDiscordClient(): Client {
  const intents: GatewayIntentBits[] = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
  ];

  // Privileged intents configured explicitly
  if (config.ENABLE_GUILD_MEMBERS_INTENT) {
    intents.push(GatewayIntentBits.GuildMembers);
  } else {
    logger.warn('GuildMembers privileged intent is disabled by configuration');
  }

  if (config.ENABLE_MESSAGE_CONTENT_INTENT) {
    intents.push(GatewayIntentBits.MessageContent);
  } else {
    logger.warn('MessageContent privileged intent is disabled by configuration');
  }

  const client = new Client({
    intents,
    partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember],
    allowedMentions: {
      parse: ['users', 'roles'],
      repliedUser: false,
    },
  });

  client.on('error', (error) => {
    logger.error({ err: error }, 'Discord client encountered an unhandled error');
  });

  client.on('warn', (warning) => {
    logger.warn({ warning }, 'Discord client warning');
  });

  return client;
}
