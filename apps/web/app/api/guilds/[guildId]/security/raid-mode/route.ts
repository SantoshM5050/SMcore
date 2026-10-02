import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authorizeGuildAccess } from '@/lib/auth/authorize';

interface RouteContext {
  params: { guildId: string };
}

const RaidModePayloadSchema = z.object({
  engage: z.boolean(),
  reason: z.string().max(300).optional(),
});

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { guildId } = params;

  const authResult = await authorizeGuildAccess(req, guildId);
  if (!authResult.authorized) return authResult.response;

  try {
    const body = await req.json();
    const parseResult = RaidModePayloadSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.errors[0]?.message || 'Invalid raid mode payload',
          },
        },
        { status: 400 }
      );
    }

    const botPort = process.env.BOT_PORT || '3001';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (process.env.SESSION_SECRET) {
      headers['x-internal-secret'] = process.env.SESSION_SECRET;
    }

    const botRes = await fetch(`http://localhost:${botPort}/guilds/${guildId}/security/raid-mode`, {
      method: 'POST',
      headers,
      body: JSON.stringify(parseResult.data),
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

    const json = await botRes.json().catch(() => null);
    return NextResponse.json(json || { success: true });
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
