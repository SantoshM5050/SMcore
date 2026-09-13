import { NextResponse } from 'next/server';
import { prisma } from '@smcore/database';

export async function GET() {
  const startTime = Date.now();
  let dbStatus: 'connected' | 'offline' = 'offline';

  // 1. Test Database connectivity with timeout
  try {
    const dbPromise = prisma.$queryRaw`SELECT 1`;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DB Timeout')), 3500)
    );
    await Promise.race([dbPromise, timeoutPromise]);
    dbStatus = 'connected';
  } catch {
    dbStatus = 'offline';
  }

  // 2. Test Bot Telemetry Endpoint
  let gatewayStatus: 'connected' | 'offline' = 'offline';
  let pingMs = 0;
  let uptimeSeconds = 0;
  let guildCount = 0;

  try {
    const botPort = process.env.BOT_PORT || '3001';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`http://localhost:${botPort}/telemetry`, {
      signal: controller.signal,
    }).catch(() => null);
    clearTimeout(timeoutId);

    if (res && res.ok) {
      const botData = await res.json().catch(() => null);
      if (botData && botData.bot === 'online') {
        gatewayStatus = 'connected';
        pingMs = typeof botData.pingMs === 'number' ? botData.pingMs : 0;
        uptimeSeconds = typeof botData.uptimeSeconds === 'number' ? botData.uptimeSeconds : 0;
        guildCount = typeof botData.guildCount === 'number' ? botData.guildCount : 0;
      }
    }
  } catch {
    gatewayStatus = 'offline';
  }

  return NextResponse.json({
    success: true,
    data: {
      api: 'OPERATIONAL' as const,
      database: {
        status: dbStatus,
      },
      gateway: {
        status: gatewayStatus,
        pingMs,
        uptimeSeconds,
        guildCount,
      },
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    },
  });
}
