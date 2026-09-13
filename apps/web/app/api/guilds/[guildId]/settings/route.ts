import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@smcore/database';
import { z } from 'zod';
import { authorizeGuildAccess } from '@/lib/auth/authorize';

interface RouteContext {
  params: { guildId: string };
}

const GuildSettingsUpdateSchema = z.object({
  prefix: z.string().min(1).max(5).optional(),
  language: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
  modLogChannelId: z.string().regex(/^\d{17,20}$/).nullable().optional(),
  actionLogChannelId: z.string().regex(/^\d{17,20}$/).nullable().optional(),
  muteRoleId: z.string().regex(/^\d{17,20}$/).nullable().optional(),
  appealUrl: z.string().url().nullable().optional(),
});

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { guildId } = params;

  const authResult = await authorizeGuildAccess(req, guildId);
  if (!authResult.authorized) return authResult.response;

  try {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId },
    });

    if (!settings) {
      // Return sensible unconfigured defaults for guild
      return NextResponse.json({
        success: true,
        data: {
          guildId,
          prefix: '!',
          language: 'en-US',
          timezone: 'UTC',
          modLogChannelId: null,
          actionLogChannelId: null,
          muteRoleId: null,
          appealUrl: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'DATABASE_UNAVAILABLE', message: 'Database unavailable' } },
      { status: 503 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { guildId } = params;

  const authResult = await authorizeGuildAccess(req, guildId);
  if (!authResult.authorized) return authResult.response;

  try {
    const body = await req.json();
    const parseResult = GuildSettingsUpdateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.errors[0]?.message || 'Invalid settings payload',
          },
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // Ensure guild exists in DB before upserting settings
    await prisma.guild.upsert({
      where: { id: guildId },
      update: {},
      create: {
        id: guildId,
        name: `Guild ${guildId}`,
        ownerId: '000000000000000000',
      },
    });

    const updated = await prisma.guildSettings.upsert({
      where: { guildId },
      update: data,
      create: {
        guildId,
        prefix: data.prefix || '!',
        language: data.language || 'en-US',
        timezone: data.timezone || 'UTC',
        modLogChannelId: data.modLogChannelId,
        actionLogChannelId: data.actionLogChannelId,
        muteRoleId: data.muteRoleId,
        appealUrl: data.appealUrl,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: error instanceof Error ? error.message : 'Database unavailable',
        },
      },
      { status: 500 }
    );
  }
}
