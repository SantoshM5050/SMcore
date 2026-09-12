import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { Client } from 'discord.js';
import { startBotBridgeServer } from '../services/bridge/botBridgeServer';

describe('Bot Bridge Internal HTTP Server — Unit & Integration Tests', () => {
  let server: http.Server;
  const testPort = 3099;
  const mockClient = {
    user: { tag: 'SMCore#0001', id: '999999999999999999' },
    ws: { ping: 42 },
    uptime: 123456,
    guilds: {
      cache: new Map([
        [
          '1288178101326708847',
          {
            id: '1288178101326708847',
            name: 'The Code Network',
            memberCount: 50,
            icon: 'icon_hash',
            ownerId: '1067745184160423946',
            channels: { cache: new Map() },
            members: { cache: new Map(), fetch: async () => null },
          },
        ],
      ]),
    },
  } as unknown as Client;

  before(async () => {
    await new Promise<void>((resolve) => {
      server = startBotBridgeServer({
        port: testPort,
        client: mockClient,
        internalSecret: 'test-bridge-secret',
      });
      server.once('listening', () => resolve());
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  const request = (path: string, options: http.RequestOptions = {}, body?: unknown): Promise<{ status: number; body: any }> => {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          host: '127.0.0.1',
          port: testPort,
          path,
          ...options,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode || 500, body: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode || 500, body: data });
            }
          });
        }
      );
      req.on('error', reject);
      if (body) {
        req.write(typeof body === 'string' ? body : JSON.stringify(body));
      }
      req.end();
    });
  };

  it('GET /health returns 200 with service status and discord user tag', async () => {
    const res = await request('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.service, 'smcore-bot');
    assert.equal(res.body.discordBot, 'SMCore#0001');
  });

  it('GET /telemetry returns real ws ping, uptime, and guild counts', async () => {
    const res = await request('/telemetry');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.bot, 'online');
    assert.equal(res.body.pingMs, 42);
    assert.equal(res.body.guildCount, 1);
  });

  it('GET /guilds returns cached live guild list', async () => {
    const res = await request('/guilds');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(Array.isArray(res.body.guilds), true);
    assert.equal(res.body.guilds.length, 1);
    assert.equal(res.body.guilds[0].id, '1288178101326708847');
    assert.equal(res.body.guilds[0].name, 'The Code Network');
  });

  it('POST with invalid authorization returns 401 Unauthorized', async () => {
    const res = await request(
      '/guilds/1288178101326708847/actions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer wrong-secret',
        },
      },
      { action: 'WARN', targetUserId: '100000000000000000', reason: 'Spam' }
    );
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('GET /unknown-route returns 404', async () => {
    const res = await request('/non-existent-route');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });
});
