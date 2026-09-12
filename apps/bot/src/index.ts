import { config } from './config';
import { createDiscordClient } from './discord/client';
import { registerReadyEvent } from './events/ready';
import { startHealthServer } from './services/health';
import { logger } from './utils/logger';

async function main(): Promise<void> {
  logger.info({ nodeEnv: config.NODE_ENV }, 'Starting SMCore Bot Service...');

  // Start health server for uptime checks
  const healthServer = startHealthServer(config.BOT_PORT);

  // Initialize Discord client
  const client = createDiscordClient();
  registerReadyEvent(client);

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down SMCore Bot gracefully...');
    healthServer.close();
    try {
      await client.destroy();
      logger.info('Discord client disconnected successfully');
    } catch (err) {
      logger.error({ err }, 'Error disconnecting Discord client');
    }
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled Promise Rejection in bot runtime');
  });

  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught Exception in bot runtime');
    process.exit(1);
  });

  // Safe login
  try {
    logger.info('Authenticating Discord client with Discord Gateway...');
    await client.login(config.DISCORD_BOT_TOKEN);
  } catch (error: any) {
    if (error?.code === 'DisallowedIntents') {
      logger.fatal(
        'Privileged Gateway Intents not enabled in Discord Developer Portal! Please enable "Message Content" and "Server Members" intents in your application settings.'
      );
    } else {
      logger.fatal({ err: error }, 'Failed to login to Discord');
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((err) => {
    logger.fatal({ err }, 'Fatal error starting SMCore bot');
    process.exit(1);
  });
}
