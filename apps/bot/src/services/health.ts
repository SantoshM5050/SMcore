import http from 'http';
import { Client } from 'discord.js';
import { startBotBridgeServer } from './bridge/botBridgeServer';

export function startHealthServer(port: number, client?: Client): http.Server {
  if (client) {
    return startBotBridgeServer({ port, client, internalSecret: process.env.SESSION_SECRET });
  }

  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/' || req.url === '/telemetry') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          service: 'smcore-bot',
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  server.listen(port);
  return server;
}

