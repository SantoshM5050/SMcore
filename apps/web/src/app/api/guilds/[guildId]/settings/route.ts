import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth';
import { AuditAction } from '@repo/database';
import { logDashboardAudit } from '@/lib/auditLogger';
import { z } from 'zod';

const settingsSchema = z.object({
  cooldownMinutes: z.number().int().min(0).max(1440),
  autoDmEnabled: z.boolean(),
  loggingEnabled: z.boolean(),
  screenshotRequired: z.boolean(),
  screenshotAllowed: z.boolean(),
  onePendingOnly: z.boolean(),
  defaultEmbedColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  timezone: z.string(),
  language: z.string(),
  commonRoleId: z.string().nullable().optional(),
  reviewPingRoleId: z.string().nullable().optional(),
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
  const body = await request.json().catch(() => ({}));
  const validation = settingsSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
  }

  const data = validation.data;

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
