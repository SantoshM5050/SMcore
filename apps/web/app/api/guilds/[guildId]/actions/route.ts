import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@smcore/database';
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
  targetUserId: z.string().optional(),
  moderatorUserId: z.string().optional(),
  reason: z.string().max(500).optional(),
  durationSeconds: z.number().int().min(1).max(2419200).optional(),
  deleteMessageSeconds: z.number().int().min(0).max(604800).optional(),
  channelId: z.string().optional(),
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
    const moderatorId = payload.moderatorUserId || authResult.userId || '123456789012345678';
    const targetId = payload.targetUserId || '200100100100100101';
    const reasonText = payload.reason?.trim() || 'Moderation action executed via SMCore console';

    // 1. Try dispatching to Bot HTTP Bridge if active
    let botDispatched = false;
    let botResponseData: any = null;

    try {
      const botPort = process.env.BOT_PORT || '3001';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

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

      if (botRes && botRes.ok) {
        botResponseData = await botRes.json().catch(() => null);
        if (botResponseData?.success) {
          botDispatched = true;
        }
      }
    } catch {
      // Bot offline or unconfigured; fallback to local persistence
    }

    // 2. Persist case and audit record into database / store
    const existingCount = await prisma.moderationCase.count({ where: { guildId } });
    const nextCaseNumber = (existingCount || 100) + 1;

    let expiresAt: string | null = null;
    if (payload.action === 'TIMEOUT' && payload.durationSeconds) {
      expiresAt = new Date(Date.now() + payload.durationSeconds * 1000).toISOString();
    }

    const newCase = await prisma.moderationCase.create({
      data: {
        guildId,
        caseNumber: nextCaseNumber,
        type: payload.action,
        targetUserId: targetId,
        moderatorUserId: moderatorId,
        moderatorTag: 'Staff Operator',
        targetUserTag: `User (${targetId})`,
        reason: reasonText,
        duration: payload.durationSeconds || null,
        expiresAt,
        status: 'ACTIVE',
        metadata: {
          channelId: payload.channelId,
          messageCount: payload.messageCount,
          slowmodeSeconds: payload.slowmodeSeconds,
          botDispatched,
        },
      },
    });

    if (payload.action === 'WARN') {
      await prisma.warning.create({
        data: {
          guildId,
          targetUserId: targetId,
          moderatorUserId: moderatorId,
          reason: reasonText,
          status: 'ACTIVE',
          caseId: newCase.id,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        guildId,
        eventType: 'MODERATION',
        action: payload.action,
        actorUserId: moderatorId,
        targetUserId: targetId,
        targetType: payload.channelId ? 'CHANNEL' : 'USER',
        channelId: payload.channelId || null,
        caseId: newCase.id,
        reason: reasonText,
        metadata: {
          caseNumber: nextCaseNumber,
          durationSeconds: payload.durationSeconds,
          messageCount: payload.messageCount,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        caseNumber: nextCaseNumber,
        caseId: newCase.id,
        action: payload.action,
        botDispatched,
        message: botDispatched
          ? 'Action dispatched to Discord bot and synchronized.'
          : 'Action registered and stored in database (simulated offline mode).',
      },
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
