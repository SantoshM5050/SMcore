import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@smcore/database';
import { SnowflakeSchema } from '@smcore/shared';

export async function GET(
  req: NextRequest,
  { params }: { params: { guildId: string; userId: string } }
) {
  const guildValidation = SnowflakeSchema.safeParse(params.guildId);
  const userValidation = SnowflakeSchema.safeParse(params.userId);

  if (!guildValidation.success || !userValidation.success) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_PARAMETERS', message: 'Invalid guild or user ID' } },
      { status: 400 }
    );
  }

  try {
    const notes = await prisma.memberNote.findMany({
      where: {
        guildId: params.guildId,
        targetUserId: params.userId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: notes,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Failed to query member notes' } },
      { status: 500 }
    );
  }
}
