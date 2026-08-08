import http from 'node:http';
import { Events } from 'discord.js';
import { botClient } from './client';
import { config } from './config';
import { onReady } from './events/ready';
import { onInteractionCreate } from './events/interactionCreate';
import { onGuildCreate } from './events/guildCreate';

const PORT = Number(process.env.PORT) || 3000;

const server = http.createServer((req, res) => {
  const url = req.url || '/';

  if (req.method === 'GET' && (url === '/health' || url.startsWith('/health?'))) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        service: 'SMCore Bot',
        discord: botClient.isReady(),
      })
    );
    return;
  }

  if (req.method === 'GET' && url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        service: 'SMCore Bot',
      })
    );
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HTTP Health Server running on 0.0.0.0:${PORT}`);
});

botClient.once(Events.ClientReady, onReady);
botClient.on(Events.InteractionCreate, onInteractionCreate);
botClient.on(Events.GuildCreate, onGuildCreate);

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection in Bot Process:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in Bot Process:', error);
});

const gracefulShutdown = (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP health server closed.');
  });
  botClient.destroy();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (config.token) {
  botClient.login(config.token).catch((err) => {
    console.error('Failed to log in to Discord API:', err.message);
  });
} else {
  console.warn('⚠️ Bot started without token. Skipping login until token is provided.');
}

