import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@smcore/database';
import {
  SnowflakeSchema,
  GuildSecuritySettingsUpdateSchema,
  SecurityAction,
} from '@smcore/shared';
import { authorizeGuildAccess } from '@/lib/auth/authorize';

const DEFAULT_SECURITY = {
  enabled: false,

  raidDetectionEnabled: false,
  raidJoinThreshold: 10,
  raidWindowSeconds: 10,
  raidModeDurationSeconds: 300,
  raidAction: SecurityAction.QUARANTINE,

  accountAgeProtectionEnabled: false,
  minimumAccountAgeHours: 24,
  accountAgeAction: SecurityAction.QUARANTINE,

  quarantineEnabled: false,
  quarantineRoleId: null as string | null,
  removeRolesOnQuarantine: false,
  restoreRolesOnRelease: false,
};

export async function GET(
  req: NextRequest,
  { params }: { params: { guildId: string } }
) {
  const authResult = await authorizeGuildAccess(req, params.guildId);
  if (!authResult.authorized) return authResult.response;

  try {
    const settings = await prisma.guildSecuritySettings.findUnique({
      where: { guildId: params.guildId },
    });

    if (!settings) {
      return NextResponse.json({
        success: true,
        data: {
          guildId: params.guildId,
          ...DEFAULT_SECURITY,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (err) {
    return NextResponse.json({
      success: true,
      data: {
        guildId: params.guildId,
        ...DEFAULT_SECURITY,
      },
      meta: { fallback: true },
    });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { guildId: string } }
) {
  const authResult = await authorizeGuildAccess(req, params.guildId);
  if (!authResult.authorized) return authResult.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'MALFORMED_JSON', message: 'Request body must be valid JSON' } },
      { status: 400 }
    );
  }

  const parseResult = GuildSecuritySettingsUpdateSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid security settings parameters',
          details: parseResult.error.format(),
        },
      },
      { status: 400 }
    );
  }

  const updateData = parseResult.data;

  try {
    const updated = await prisma.guildSecuritySettings.upsert({
      where: { guildId: params.guildId },
      create: {
        guildId: params.guildId,
        ...DEFAULT_SECURITY,
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
          message: 'Failed to update security settings in database',
        },
      },
      { status: 500 }
    );
  }
}
