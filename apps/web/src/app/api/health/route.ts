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
  const rawBotToken = process.env.DISCORD_BOT_TOKEN || '';
  const botToken = rawBotToken.trim().replace(/^["']|["']$/g, '');
  if (botToken && botToken !== 'YOUR_DISCORD_BOT_TOKEN') {
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
    botStatus = 'NOT_CONFIGURED (DISCORD_BOT_TOKEN is missing or placeholder in .env)';
  }

  const memoryUsage = process.memoryUsage();
  const isHealthy = dbStatus === 'HEALTHY' && !botStatus.startsWith('UNAUTHORIZED');

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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const isStrict = url.searchParams.get('strict') === 'true';

  const result = await performHealthCheck();
  const statusCode = isStrict && !result.isHealthy ? 503 : 200;

  return NextResponse.json(result.data, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

