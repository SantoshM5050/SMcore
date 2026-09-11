import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth';
import { AuditAction, StaffPermission } from '@repo/database';
import { logDashboardAudit } from '@/lib/auditLogger';
import { checkStaffPermission } from '@/lib/rbac';
import { z } from 'zod';

const settingsSchema = z.object({
  autoDmEnabled: z.boolean().optional(),
  loggingEnabled: z.boolean().optional(),
  defaultEmbedColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
  muteRoleId: z.string().nullable().optional(),
  quarantineRoleId: z.string().nullable().optional(),
  appealUrl: z.string().url().nullable().or(z.literal('')).optional(),
  raidModeActive: z.boolean().optional(),
});

export async function GET(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;

  let settings = await prisma.guildSettings.findUnique({
    where: { guildId },
  });

  if (!settings) {
    settings = await prisma.guildSettings.create({
      data: { guildId },
    });
  }

  return NextResponse.json(settings);
}

export async function PATCH(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;
  const hasPerm = await checkStaffPermission(guildId, user.discordId, StaffPermission.MANAGE_SETTINGS);
  if (!hasPerm) {
    return NextResponse.json({ error: 'Missing MANAGE_SETTINGS permission' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const validation = settingsSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
  }

  const data = validation.data;
  if (data.appealUrl === '') data.appealUrl = null;

  const updatedSettings = await prisma.guildSettings.upsert({
    where: { guildId },
    update: data,
    create: { guildId, ...data },
  });

  await logDashboardAudit(
    guildId,
    user.discordId,
    `${user.username}#${user.discriminator}`,
    AuditAction.SETTINGS_UPDATED,
    data
  );

  return NextResponse.json(updatedSettings);
}
