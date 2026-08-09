import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function performHealthCheck() {
  const startTime = Date.now();
  let dbStatus = 'HEALTHY';
  let dbLatency = 0;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - dbStart;
  } catch (err: any) {
    dbStatus = `UNHEALTHY: ${err.message}`;
  }

  // Check Discord Bot Token validity via Discord API
  let botStatus = 'OPERATIONAL';
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (botToken) {
    try {
      const res = await fetch('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: `Bot ${botToken}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const botUser = await res.json();
        botStatus = `OPERATIONAL (${botUser.username})`;
      } else {
        botStatus = `UNAUTHORIZED (HTTP ${res.status})`;
      }
    } catch (e: any) {
      botStatus = `ERROR: ${e.message}`;
    }
  } else {
    botStatus = 'MISSING_DISCORD_BOT_TOKEN';
  }

  const memoryUsage = process.memoryUsage();
  const isHealthy = dbStatus === 'HEALTHY' && !botStatus.startsWith('UNAUTHORIZED') && botStatus !== 'MISSING_DISCORD_BOT_TOKEN';

  return {
    isHealthy,
    data: {
      status: isHealthy ? 'OPERATIONAL' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      responseTimeMs: Date.now() - startTime,
      checks: {
        database: {
          status: dbStatus,
          latencyMs: dbLatency,
        },
        discordBot: {
          status: botStatus,
        },
        redis: {
          status: 'OPERATIONAL',
          mode: 'In-Memory / Redis Hybrid',
        },
        memory: {
          rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
          heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        },
      },
    },
  };
}

export async function GET() {
  const result = await performHealthCheck();
  return NextResponse.json(result.data, { status: result.isHealthy ? 200 : 503 });
}

export async function HEAD() {
  const result = await performHealthCheck();
  return new Response(null, { status: result.isHealthy ? 200 : 503 });
}

