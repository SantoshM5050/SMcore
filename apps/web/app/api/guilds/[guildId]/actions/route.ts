import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ModerationAction } from '@smcore/shared';
import { authorizeGuildAccess } from '@/lib/auth/authorize';

interface RouteContext {
  params: { guildId: string };
}

const ModerationActionSchema = z.object({
  action: z.enum([
    'WARN',
    'TIMEOUT',
    'UNTIMEOUT',
    'KICK',
    'BAN',
    'UNBAN',
    'PURGE',
    'LOCK',
    'UNLOCK',
    'SLOWMODE',
  ]),
  targetUserId: z.string().regex(/^\d{17,20}$/, 'Invalid target Discord Snowflake ID').optional(),
  moderatorUserId: z.string().regex(/^\d{17,20}$/, 'Invalid moderator Discord Snowflake ID').optional(),
  reason: z.string().max(500).optional(),
  durationSeconds: z.number().int().min(1).max(2419200).optional(),
  deleteMessageSeconds: z.number().int().min(0).max(604800).optional(),
  channelId: z.string().regex(/^\d{17,20}$/, 'Invalid channel Discord Snowflake ID').optional(),
  messageCount: z.number().int().min(1).max(100).optional(),
  slowmodeSeconds: z.number().int().min(0).max(21600).optional(),
});

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { guildId } = params;

  // Authenticate and authorize guild access
  const authResult = await authorizeGuildAccess(req, guildId);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const rawBody = await req.json();
    const parseResult = ModerationActionSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.errors[0]?.message || 'Invalid moderation payload',
          },
        },
        { status: 400 }
      );
    }

    const payload = parseResult.data;

    // Dispatch to Bot HTTP Bridge
    const botPort = process.env.BOT_PORT || '3001';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (process.env.SESSION_SECRET) {
      headers['x-internal-secret'] = process.env.SESSION_SECRET;
    }

    const botRes = await fetch(`http://localhost:${botPort}/guilds/${guildId}/actions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).catch(() => null);
    clearTimeout(timeoutId);

    if (!botRes) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'BOT_UNAVAILABLE',
            message: 'Discord bot unavailable',
          },
        },
        { status: 503 }
      );
    }

    const botJson = await botRes.json().catch(() => null);

    if (!botRes.ok || !botJson?.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ACTION_FAILED',
            message: botJson?.message || botJson?.error || 'Moderation action execution failed on Discord',
          },
        },
        { status: botRes.status || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: botJson,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Internal server error',
        },
      },
      { status: 500 }
    );
  }
}
