import { Client, Events } from 'discord.js';
import { logger } from '../utils/logger';

export function registerReadyEvent(client: Client): void {
  client.once(Events.ClientReady, (readyClient) => {
    logger.info(
      {
        tag: readyClient.user.tag,
        id: readyClient.user.id,
        guildCount: readyClient.guilds.cache.size,
      },
      '🚀 SMCore Discord Bot logged in and ready'
    );
  });
}
