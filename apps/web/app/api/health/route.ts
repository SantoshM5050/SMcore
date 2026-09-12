import { NextResponse } from 'next/server';
import { prisma } from '@smcore/database';

export async function GET() {
  const telemetry = {
    timestamp: new Date().toISOString(),
    api: 'OPERATIONAL' as 'OPERATIONAL' | 'DEGRADED' | 'OFFLINE',
    database: 'UNKNOWN' as 'CONNECTED' | 'OFFLINE',
    botGateway: 'UNKNOWN' as 'ONLINE' | 'OFFLINE',
    latencyMs: 0,
  };

  const startTime = Date.now();

  // 1. Test Database connectivity with timeout
  try {
    const dbPromise = prisma.$queryRaw`SELECT 1`;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DB Timeout')), 1000)
    );
    await Promise.race([dbPromise, timeoutPromise]);
    telemetry.database = 'CONNECTED';
  } catch {
    telemetry.database = 'OFFLINE';
  }

  // 2. Test Bot Health Endpoint
  try {
    const botPort = process.env.BOT_PORT || '3001';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);
    const botRes = await fetch(`http://localhost:${botPort}/health`, {
      signal: controller.signal,
    }).catch(() => null);
    clearTimeout(timeoutId);

    if (botRes && botRes.ok) {
      telemetry.botGateway = 'ONLINE';
    } else {
      telemetry.botGateway = 'OFFLINE';
    }
  } catch {
    telemetry.botGateway = 'OFFLINE';
  }

  telemetry.latencyMs = Date.now() - startTime;

  return NextResponse.json({
    success: true,
    data: telemetry,
  });
}
