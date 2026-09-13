import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@smcore/database';
import { SnowflakeSchema } from '@smcore/shared';
import { authorizeGuildAccess } from '@/lib/auth/authorize';

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
