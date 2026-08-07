import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth';
import { AuditAction } from '@repo/database';
import { logDashboardAudit } from '@/lib/auditLogger';
import { z } from 'zod';

const embedConfigSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(256),
  description: z.string().min(1, 'Description is required').max(4000),
  footerText: z.string().max(2048).nullable().optional(),
  footerIconUrl: z.string().url().or(z.literal('')).nullable().optional(),
  thumbnailUrl: z.string().url().or(z.literal('')).nullable().optional(),
  imageUrl: z.string().url().or(z.literal('')).nullable().optional(),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color hex code'),
  buttonLabel: z.string().min(1).max(80),
  buttonEmoji: z.string().nullable().optional(),
});

export async function GET(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;

  let embed = await prisma.embedConfig.findFirst({
    where: { guildId },
  });

  if (!embed) {
    embed = await prisma.embedConfig.create({
      data: {
        guildId,
        title: '🎮 Gaming Role Verification Request',
        description: 'Click below to apply for official rank roles! Select your target role and fill out your in-game credentials.',
        footerText: 'Role Request Management System',
        colorHex: '#5865F2',
        buttonLabel: 'Apply for Role',
        buttonEmoji: '🎮',
      },
    });
  }

  return NextResponse.json(embed);
}

export async function POST(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;
  const body = await request.json().catch(() => ({}));
  const validation = embedConfigSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
  }

  const data = validation.data;

  const existing = await prisma.embedConfig.findFirst({
    where: { guildId },
  });

  let embed;
  if (existing) {
    embed = await prisma.embedConfig.update({
      where: { id: existing.id },
      data: {
        title: data.title,
        description: data.description,
        footerText: data.footerText || null,
        footerIconUrl: data.footerIconUrl || null,
        thumbnailUrl: data.thumbnailUrl || null,
        imageUrl: data.imageUrl || null,
        colorHex: data.colorHex,
        buttonLabel: data.buttonLabel,
        buttonEmoji: data.buttonEmoji || null,
      },
    });
  } else {
    embed = await prisma.embedConfig.create({
      data: {
        guildId,
        title: data.title,
        description: data.description,
        footerText: data.footerText || null,
        footerIconUrl: data.footerIconUrl || null,
        thumbnailUrl: data.thumbnailUrl || null,
        imageUrl: data.imageUrl || null,
        colorHex: data.colorHex,
        buttonLabel: data.buttonLabel,
        buttonEmoji: data.buttonEmoji || null,
      },
    });
  }

  await logDashboardAudit(
    guildId,
    user.discordId,
    `${user.username}#${user.discriminator}`,
    AuditAction.PANEL_UPDATED,
    { title: data.title, colorHex: data.colorHex }
  );

  return NextResponse.json(embed);
}
