import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth';
import { DiscordApi } from '@/lib/discord';
import { AuditAction } from '@repo/database';
import { logDashboardAudit } from '@/lib/auditLogger';
import { z } from 'zod';

const updateRoleSchema = z.object({
  roleId: z.string(),
  roleName: z.string(),
  roleColor: z.string().optional(),
  isRequestable: z.boolean().optional(),
  enabled: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  minRankRequired: z.string().nullable().optional(),
});

export async function GET(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;

  // Try to sync with Discord API if bot token available
  try {
    const discordRoles = await DiscordApi.getGuildRoles(guildId);
    for (const r of discordRoles) {
      if (r.managed || r.name === '@everyone') continue;
      await prisma.roleConfiguration.upsert({
        where: {
          guildId_roleId: { guildId, roleId: r.id },
        },
        update: {
          roleName: r.name,
          roleColor: r.color === 0 ? '#99AAB5' : `#${r.color.toString(16).padStart(6, '0')}`,
        },
        create: {
          guildId,
          roleId: r.id,
          roleName: r.name,
          roleColor: r.color === 0 ? '#99AAB5' : `#${r.color.toString(16).padStart(6, '0')}`,
          isRequestable: false,
          enabled: true,
        },
      });
    }
  } catch (err) {
    console.warn(`Could not sync Discord live roles for guild ${guildId}:`, err);
  }

  const roles = await prisma.roleConfiguration.findMany({
    where: { guildId },
    orderBy: { displayOrder: 'asc' },
  });

  return NextResponse.json(roles);
}

export async function POST(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;
  const body = await request.json().catch(() => ({}));
  const validation = updateRoleSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
  }

  const data = validation.data;

  const role = await prisma.roleConfiguration.upsert({
    where: {
      guildId_roleId: { guildId, roleId: data.roleId },
    },
    update: {
      roleName: data.roleName,
      ...(data.roleColor && { roleColor: data.roleColor }),
      ...(data.isRequestable !== undefined && { isRequestable: data.isRequestable }),
      ...(data.enabled !== undefined && { enabled: data.enabled }),
      ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
      ...(data.minRankRequired !== undefined && { minRankRequired: data.minRankRequired }),
    },
    create: {
      guildId,
      roleId: data.roleId,
      roleName: data.roleName,
      roleColor: data.roleColor || '#99AAB5',
      isRequestable: data.isRequestable ?? true,
      enabled: data.enabled ?? true,
      displayOrder: data.displayOrder ?? 0,
      minRankRequired: data.minRankRequired || null,
    },
  });

  await logDashboardAudit(
    guildId,
    user.discordId,
    `${user.username}#${user.discriminator}`,
    AuditAction.ROLE_UPDATED,
    {
      roleId: role.roleId,
      roleName: role.roleName,
      isRequestable: role.isRequestable,
      enabled: role.enabled,
    }
  );

  return NextResponse.json(role);
}
