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

export async function POST(
  req: NextRequest,
  { params }: { params: { guildId: string; userId: string } }
) {
  const authResult = await authorizeGuildAccess(req, params.guildId);
  if (!authResult.authorized) return authResult.response;

  try {
    const { reason } = await req.json();
    const reasonText = reason?.trim() || 'Warning issued by staff member';

    const warning = await prisma.warning.create({
      data: {
        guildId: params.guildId,
        targetUserId: params.userId,
        moderatorUserId: authResult.userId || '123456789012345678',
        reason: reasonText,
        status: 'ACTIVE',
      },
    });

    const activeCount = await prisma.warning.count({
      where: { guildId: params.guildId, targetUserId: params.userId, status: 'ACTIVE' },
    });

    return NextResponse.json({
      success: true,
      data: { warning, activeCount },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { message: 'Failed to create warning' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { guildId: string; userId: string } }
) {
  const authResult = await authorizeGuildAccess(req, params.guildId);
  if (!authResult.authorized) return authResult.response;

  try {
    const warnId = req.nextUrl.searchParams.get('warnId');
    if (!warnId) {
      return NextResponse.json({ success: false, error: { message: 'warnId is required' } }, { status: 400 });
    }

    await prisma.warning.update({
      where: { id: warnId },
      data: { status: 'REVOKED' },
    });

    return NextResponse.json({ success: true, message: 'Warning revoked successfully' });
  } catch (err) {
    return NextResponse.json({ success: false, error: { message: 'Failed to revoke warning' } }, { status: 500 });
  }
}

