import http from 'node:http';
import dns from 'node:dns';
import { Events } from 'discord.js';
import { botClient, resetBotClient } from './client';
import { config } from './config';
import { onReady } from './events/ready';
import { onInteractionCreate } from './events/interactionCreate';
import { onGuildCreate } from './events/guildCreate';
import { onGuildDelete } from './events/guildDelete';
import { onGuildMemberAdd } from './events/guildMemberAdd';
import { onGuildMemberRemove } from './events/guildMemberRemove';
import { onVoiceStateUpdate } from './events/voiceStateUpdate';
import { onMessageDelete } from './events/messageDelete';
import { onMessageUpdate } from './events/messageUpdate';
import { onAutoModerationActionExecution } from './events/autoModerationActionExecution';
import { onGuildBanAdd, onGuildBanRemove } from './events/guildBanEvents';

// Force DNS resolution to prefer IPv4 first (bypasses IPv6 connect timeouts on Render/Linux)
if (dns && dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

let lastLoginError: string | null = null;
let isLoggingIn = false;
let lastLoginAttemptTime = 0;
let useMinimalIntents = false;
const PORT = Number(process.env.PORT || process.env.BOT_PORT) || 3001;

function attachClientListeners(client: typeof botClient) {
  client.removeAllListeners();
  client.once(Events.ClientReady, (c) => {
    isLoggingIn = false;
    lastLoginError = null;
    onReady(c);
  });
  client.on(Events.InteractionCreate, onInteractionCreate);
  client.on(Events.GuildCreate, onGuildCreate);
  client.on(Events.GuildDelete, onGuildDelete);
  client.on(Events.GuildMemberAdd, onGuildMemberAdd);
  client.on(Events.GuildMemberRemove, onGuildMemberRemove);
  client.on(Events.VoiceStateUpdate, onVoiceStateUpdate);
  client.on(Events.MessageDelete, onMessageDelete);
  client.on(Events.MessageUpdate, onMessageUpdate);
  client.on(Events.AutoModerationActionExecution, onAutoModerationActionExecution);
  client.on(Events.GuildBanAdd, onGuildBanAdd);
  client.on(Events.GuildBanRemove, onGuildBanRemove);

  client.on(Events.Error, (error: any) => {
    console.error('🔴 Discord Client Error:', error);
    lastLoginError = error.message || String(error);
  });

  client.on(Events.ShardDisconnect, (event: any, id: number) => {
    const reason = event ? event.reason || `code ${event.code}` : 'Unknown';
    console.warn(`⚠️ Discord Shard ${id} disconnected: ${reason}`);
    lastLoginError = `Shard ${id} disconnected (${reason})`;
    isLoggingIn = false;
  });

  client.on(Events.ShardReconnecting, (id: number) => {
    console.log(`🔄 Discord Shard ${id} reconnecting...`);
  });
}

function doLogin() {
  const rawToken = process.env.DISCORD_BOT_TOKEN || config.token || '';
  const token = rawToken.trim().replace(/^["']|["']$/g, '').trim();

  if (!token) {
    lastLoginError = 'DISCORD_BOT_TOKEN is missing or empty in process.env';
    console.warn('⚠️ Bot started without token. Skipping login until DISCORD_BOT_TOKEN is set.');
    return;
  }

  if (botClient && botClient.isReady()) {
    isLoggingIn = false;
    lastLoginError = null;
    return;
  }

  const currentStatus = botClient && botClient.ws ? botClient.ws.status : 5;
  // 0 = READY, 1 = CONNECTING, 2 = RECONNECTING, 3 = IDLE, 4 = NEARLY
  if (currentStatus === 0 || currentStatus === 1 || currentStatus === 2 || currentStatus === 3 || currentStatus === 4) {
    console.log(`⏳ Discord Client status is ${currentStatus}, letting client connect naturally...`);
    return;
  }

  // Rate limit protection: Cooldown of 45 seconds between new Client login attempts
  const now = Date.now();
  if (now - lastLoginAttemptTime < 45000) {
    console.log(`⏳ Cooldown active (last login attempt was ${Math.round((now - lastLoginAttemptTime) / 1000)}s ago). Waiting for rate limit reset...`);
    return;
  }

  if (isLoggingIn) {
    console.log('⏳ Login attempt already in progress...');
    return;
  }

  isLoggingIn = true;
  lastLoginAttemptTime = now;
  console.log(`🔑 Creating fresh Discord client (minimalIntents: ${useMinimalIntents}) & attempting login...`);

  // Re-create a fresh Client instance
  const activeClient = resetBotClient(useMinimalIntents);
  attachClientListeners(activeClient);

  // Safety fallback: reset isLoggingIn flag after 30 seconds if not ready
  setTimeout(() => {
    if (!activeClient.isReady()) {
      isLoggingIn = false;
    }
  }, 30000);

  try {
    const loginPromise = activeClient.login(token);
    loginPromise
      .then(() => {
        isLoggingIn = false;
        lastLoginError = null;
        console.log('✅ botClient.login() promise resolved successfully.');
      })
      .catch((err: any) => {
        isLoggingIn = false;
        const errStr = err.message || String(err);
        lastLoginError = errStr;
        console.error('❌ Failed to log in to Discord API:', errStr);

        if (!useMinimalIntents && (errStr.includes('Disallowed') || errStr.includes('intent') || errStr.includes('4014'))) {
          console.warn('⚠️ Privileged Intents rejected. Retrying login with minimal intents...');
          useMinimalIntents = true;
          setTimeout(doLogin, 5000);
        }
      });
  } catch (syncErr: any) {
    isLoggingIn = false;
    lastLoginError = `Sync error: ${syncErr.message || String(syncErr)}`;
    console.error('❌ Synchronous login error:', lastLoginError);
  }
}

// Pure in-memory HTTP Health Check Server (Zero outbound Discord API calls per ping)
const server = http.createServer((req, res) => {
  const method = req.method?.toUpperCase();

  if (method === 'GET' || method === 'HEAD') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });

    if (method === 'HEAD') {
      res.end();
      return;
    }

    const token = (process.env.DISCORD_BOT_TOKEN || config.token || '').trim();
    const isReady = botClient ? botClient.isReady() : false;
    const wsStatus = botClient && botClient.ws ? botClient.ws.status : -1;

    let discordReason = isReady ? 'Connected' : 'Not Connected';
    if (!isReady) {
      if (!token) {
        discordReason = 'DISCORD_BOT_TOKEN environment variable is missing in Render settings';
      } else if (lastLoginError) {
        discordReason = `Login status: ${lastLoginError}`;
      } else {
        discordReason = `Gateway status: ${wsStatus} (0=Ready, 1=Connecting, 2=Reconnecting, 5=Disconnected)`;
      }
    }

    res.end(
      JSON.stringify({
        status: 'ok',
        service: 'SMCore Bot',
        discord: isReady,
        discordReason,
        tokenConfigured: Boolean(token),
        tokenLength: token.length,
        wsStatus,
        lastError: lastLoginError,
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      })
    );
    return;
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
  if (botClient) botClient.destroy();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Initial login attempt
doLogin();

// Heartbeat check every 60 seconds with safe rate limit checks
setInterval(() => {
  if (botClient && !botClient.isReady()) {
    doLogin();
  }
}, 60000);
