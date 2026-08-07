import { Events } from 'discord.js';
import { botClient } from './client';
import { config } from './config';
import { onReady } from './events/ready';
import { onInteractionCreate } from './events/interactionCreate';
import { onGuildCreate } from './events/guildCreate';

botClient.once(Events.ClientReady, onReady);
botClient.on(Events.InteractionCreate, onInteractionCreate);
botClient.on(Events.GuildCreate, onGuildCreate);

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection in Bot Process:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in Bot Process:', error);
});

if (config.token) {
  botClient.login(config.token).catch((err) => {
    console.error('Failed to log in to Discord API:', err.message);
  });
} else {
  console.warn('⚠️ Bot started without token. Skipping login until token is provided.');
}
