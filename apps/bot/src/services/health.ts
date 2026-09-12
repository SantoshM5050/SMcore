import http from 'http';
import { logger } from '../utils/logger';

export function startHealthServer(port: number): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
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

  server.listen(port, () => {
    logger.info({ port }, 'Health server listening for uptime monitoring');
  });

  return server;
}
