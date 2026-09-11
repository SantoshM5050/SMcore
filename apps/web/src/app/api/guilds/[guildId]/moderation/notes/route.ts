import { NextResponse } from 'next/server';
import { prisma, StaffPermission } from '@repo/database';
import { AuthService } from '@/lib/auth';
import { checkStaffPermission } from '@/lib/rbac';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const noteSchema = z.object({
  userId: z.string().min(1),
  content: z.string().min(1).max(2000),
});

export async function GET(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  const where: any = { guildId };
  if (userId) where.userId = userId;

  const notes = await prisma.memberNote.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json(notes);
}

export async function POST(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;
  const hasPerm = await checkStaffPermission(guildId, user.discordId, StaffPermission.WARN_MEMBERS);
  if (!hasPerm) {
    return NextResponse.json({ error: 'Missing permission to add notes' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const validation = noteSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
  }

  const data = validation.data;
  const note = await prisma.memberNote.create({
    data: {
      guildId,
      userId: data.userId,
      authorId: user.discordId,
      authorTag: `${user.username}#${user.discriminator}`,
      content: data.content,
    },
  });

  return NextResponse.json(note);
}

export async function DELETE(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;
  const hasPerm = await checkStaffPermission(guildId, user.discordId, StaffPermission.MANAGE_SETTINGS);
  if (!hasPerm) {
    return NextResponse.json({ error: 'Missing permission to delete notes' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing note id' }, { status: 400 });

  const deleted = await prisma.memberNote.delete({ where: { id } });
  return NextResponse.json(deleted);
}
