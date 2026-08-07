import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth';
import { z } from 'zod';

const commentSchema = z.object({
  comment: z.string().min(1, 'Comment text is required').max(1000),
});

export async function GET(request: Request, { params }: { params: { guildId: string; id: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const comments = await prisma.applicationComment.findMany({
    where: { applicationId: id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(comments);
}

export async function POST(request: Request, { params }: { params: { guildId: string; id: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await request.json().catch(() => ({}));
  const validation = commentSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
  }

  const comment = await prisma.applicationComment.create({
    data: {
      applicationId: id,
      authorId: user.discordId,
      authorTag: `${user.username}#${user.discriminator}`,
      comment: validation.data.comment,
    },
  });

  return NextResponse.json(comment);
}
