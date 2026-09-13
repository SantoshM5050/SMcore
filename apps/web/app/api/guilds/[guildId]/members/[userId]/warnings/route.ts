import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@smcore/database';
import { SnowflakeSchema } from '@smcore/shared';

import { authorizeGuildAccess } from '@/lib/auth/authorize';

export async function GET(
  req: NextRequest,
  { params }: { params: { guildId: string; userId: string } }
) {
  const authResult = await authorizeGuildAccess(req, params.guildId);
  if (!authResult.authorized) return authResult.response;

  const userValidation = SnowflakeSchema.safeParse(params.userId);
  if (!userValidation.success) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_PARAMETERS', message: 'Invalid target user ID' } },
      { status: 400 }
    );
  }

  const includeRevoked = req.nextUrl.searchParams.get('includeRevoked') === 'true';

  try {
    const warnings = await prisma.warning.findMany({
      where: {
        guildId: params.guildId,
        targetUserId: params.userId,
        ...(includeRevoked ? {} : { status: 'ACTIVE' }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: warnings,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Failed to query warnings' } },
      { status: 500 }
    );
  }
}
