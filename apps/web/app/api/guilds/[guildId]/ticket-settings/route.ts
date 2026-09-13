import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@smcore/database';
import {
  GuildTicketSettingsUpdateSchema,
  SnowflakeSchema,
} from '@smcore/shared';
import { authorizeGuildAccess } from '@/lib/auth/authorize';

const DEFAULT_SETTINGS = (guildId: string) => ({
  guildId,
  enabled: true,
  ticketCategoryChannelId: null,
  ticketLogChannelId: null,
  transcriptChannelId: null,
  supportRoleIds: [],
  maxOpenTicketsPerUser: 3,
  cooldownSeconds: 60,
  autoCloseEnabled: false,
  autoCloseHours: 24,
  allowUserClose: true,
  allowReopen: true,
  deleteAfterClose: false,
  transcriptEnabled: true,
});

export async function GET(
  req: NextRequest,
  { params }: { params: { guildId: string } }
) {
  const authResult = await authorizeGuildAccess(req, params.guildId);
  if (!authResult.authorized) return authResult.response;

  try {
    const settings = await prisma.guildTicketSettings.findUnique({
      where: { guildId: params.guildId },
    });

    return NextResponse.json({
      success: true,
      data: settings || DEFAULT_SETTINGS(params.guildId),
    });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      data: DEFAULT_SETTINGS(params.guildId),
      meta: {
        fallback: true,
        dbOffline: true,
      },
    });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { guildId: string } }
) {
  const authResult = await authorizeGuildAccess(req, params.guildId);
  if (!authResult.authorized) return authResult.response;

  try {
    const body = await req.json();
    const parseResult = GuildTicketSettingsUpdateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid ticket settings configuration',
            details: parseResult.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const updated = await prisma.guildTicketSettings.upsert({
      where: { guildId: params.guildId },
      create: {
        guildId: params.guildId,
        ...parseResult.data,
      },
      update: parseResult.data,
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to persist ticket settings update',
        },
      },
      { status: 500 }
    );
  }
}
