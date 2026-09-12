import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@smcore/database';
import {
  SnowflakeSchema,
  GuildProtectionSettingsUpdateSchema,
  AutoModPunishment,
} from '@smcore/shared';

const DEFAULT_PROTECTION = {
  antiSpamEnabled: false,
  antiSpamMessageLimit: 5,
  antiSpamWindowSeconds: 5,
  duplicateMessageLimit: 3,
  antiSpamPunishment: AutoModPunishment.TIMEOUT,

  massMentionEnabled: false,
  maxUserMentions: 5,
  maxRoleMentions: 3,
  maxTotalMentions: 6,
  everyoneMentionAllowed: false,
  massMentionPunishment: AutoModPunishment.TIMEOUT,

  inviteFilterEnabled: false,
  allowedInviteGuilds: [] as string[],
  inviteFilterPunishment: AutoModPunishment.DELETE,

  externalLinkFilterEnabled: false,
  allowedDomains: [] as string[],
  blockedDomains: [] as string[],
  externalLinkPunishment: AutoModPunishment.DELETE,

  keywordFilterEnabled: false,
  prohibitedKeywords: [] as string[],
  keywordPunishment: AutoModPunishment.DELETE,

  deleteViolatingMessages: true,
};

export async function GET(
  req: NextRequest,
  { params }: { params: { guildId: string } }
) {
  const guildValidation = SnowflakeSchema.safeParse(params.guildId);
  if (!guildValidation.success) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_GUILD_ID', message: 'Invalid Discord guild ID' } },
      { status: 400 }
    );
  }

  try {
    const settings = await prisma.guildProtectionSettings.findUnique({
      where: { guildId: params.guildId },
    });

    if (!settings) {
      return NextResponse.json({
        success: true,
        data: {
          guildId: params.guildId,
          ...DEFAULT_PROTECTION,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: true,
        data: {
          guildId: params.guildId,
          ...DEFAULT_PROTECTION,
        },
        meta: { fallback: true },
      }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { guildId: string } }
) {
  const guildValidation = SnowflakeSchema.safeParse(params.guildId);
  if (!guildValidation.success) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_GUILD_ID', message: 'Invalid Discord guild ID' } },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'MALFORMED_JSON', message: 'Request body must be valid JSON' } },
      { status: 400 }
    );
  }

  const parseResult = GuildProtectionSettingsUpdateSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid protection settings parameters',
          details: parseResult.error.format(),
        },
      },
      { status: 400 }
    );
  }

  const updateData = parseResult.data;

  try {
    const updated = await prisma.guildProtectionSettings.upsert({
      where: { guildId: params.guildId },
      create: {
        guildId: params.guildId,
        ...DEFAULT_PROTECTION,
        ...updateData,
      },
      update: updateData,
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
          message: 'Failed to update protection settings in database',
        },
      },
      { status: 500 }
    );
  }
}
