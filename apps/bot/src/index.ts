import http from 'node:http';
import { Events } from 'discord.js';
import { botClient } from './client';
import { config } from './config';
import { onReady } from './events/ready';
import { onInteractionCreate } from './events/interactionCreate';
import { onGuildCreate } from './events/guildCreate';

const PORT = Number(process.env.PORT || process.env.BOT_PORT) || 3001;

let lastLoginError: string | null = null;

const server = http.createServer((req, res) => {
  const urlRaw = req.url || '/';
  const url = urlRaw.split('?')[0].replace(/\/$/, '') || '/';
  const method = req.method?.toUpperCase();

  if (method === 'GET' || method === 'HEAD') {
    if (
      url === '/' ||
      url === '/health' ||
      url === '/api/health' ||
      url === '/ping' ||
      url === '/status'
    ) {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });

      if (method === 'HEAD') {
        res.end();
        return;
      }

      const isReady = botClient.isReady();
      let discordReason = isReady ? 'Connected' : 'Not Connected';
      if (!isReady) {
        if (!config.token) {
          discordReason = 'DISCORD_BOT_TOKEN environment variable is missing in Render settings';
        } else if (lastLoginError) {
          discordReason = `Login failed: ${lastLoginError}`;
        } else {
          discordReason = 'Login in progress or connection dropped';
        }
      }

      res.end(
        JSON.stringify({
          status: 'ok',
          service: 'SMCore Bot',
          discord: isReady,
          discordReason,
          uptime: Math.floor(process.uptime()),
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }
  }

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    });
    res.end();
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ HTTP Health Server Error: Port ${PORT} is already in use.`);
  } else {
    console.error('❌ HTTP Health Server Error:', err);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HTTP Health Server running on 0.0.0.0:${PORT}`);
});

botClient.once(Events.ClientReady, onReady);
botClient.on(Events.InteractionCreate, onInteractionCreate);
botClient.on(Events.GuildCreate, onGuildCreate);

botClient.on(Events.Error, (error) => {
  console.error('🔴 Discord Client Error:', error);
  lastLoginError = error.message;
});

botClient.on(Events.ShardDisconnect, (event, id) => {
  console.warn(`⚠️ Discord Shard ${id} disconnected (code: ${event.code}):`, event.reason);
  lastLoginError = `Shard ${id} disconnected (code ${event.code}: ${event.reason || 'Unknown'})`;
});

botClient.on(Events.ShardReconnecting, (id) => {
  console.log(`🔄 Discord Shard ${id} reconnecting...`);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('Unhandled Promise Rejection in Bot Process:', reason);
});

process.on('uncaughtException', (error: any) => {
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

function doLogin() {
  if (!config.token) {
    console.warn('⚠️ Bot started without token. Skipping login until DISCORD_BOT_TOKEN is set.');
    return;
  }
  console.log('🔑 Attempting to log in to Discord API...');
  botClient.login(config.token).catch((err) => {
    lastLoginError = err.message;
    console.error('❌ Failed to log in to Discord API:', err.message);
    console.log('🔄 Will retry logging in to Discord in 30 seconds...');
    setTimeout(doLogin, 30000);
  });
}

doLogin();


