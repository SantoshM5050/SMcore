import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@smcore/database';
import { SnowflakeSchema } from '@smcore/shared';

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
    const settings = await prisma.guildSecuritySettings.findUnique({
      where: { guildId: params.guildId },
    });

    return NextResponse.json({
      success: true,
      data: {
        guildId: params.guildId,
        enabled: settings?.enabled ?? false,
        raidDetectionEnabled: settings?.raidDetectionEnabled ?? false,
        accountAgeProtectionEnabled: settings?.accountAgeProtectionEnabled ?? false,
        raidJoinThreshold: settings?.raidJoinThreshold ?? 10,
        raidWindowSeconds: settings?.raidWindowSeconds ?? 10,
        quarantineRoleConfigured: Boolean(settings?.quarantineRoleId),
        operationalStatus: 'OPERATIONAL',
      },
    });
  } catch (err) {
    return NextResponse.json({
      success: true,
      data: {
        guildId: params.guildId,
        enabled: false,
        raidDetectionEnabled: false,
        accountAgeProtectionEnabled: false,
        raidJoinThreshold: 10,
        raidWindowSeconds: 10,
        quarantineRoleConfigured: false,
        operationalStatus: 'FALLBACK_OPERATIONAL',
      },
      meta: { fallback: true },
    });
  }
}
