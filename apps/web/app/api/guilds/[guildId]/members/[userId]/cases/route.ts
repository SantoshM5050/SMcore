import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@smcore/database';
import { SnowflakeSchema, PaginationQuerySchema } from '@smcore/shared';

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

  const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
  const query = PaginationQuerySchema.parse(searchParams);
  const skip = (query.page - 1) * query.pageSize;

  try {
    const [items, total] = await Promise.all([
      prisma.moderationCase.findMany({
        where: {
          guildId: params.guildId,
          targetUserId: params.userId,
        },
        orderBy: { caseNumber: 'desc' },
        skip,
        take: query.pageSize,
      }),
      prisma.moderationCase.count({
        where: {
          guildId: params.guildId,
          targetUserId: params.userId,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: Math.ceil(total / query.pageSize),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Failed to query member cases' } },
      { status: 500 }
    );
  }
}
