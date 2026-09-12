import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@smcore/database';
import { CaseFilterSchema, SnowflakeSchema } from '@smcore/shared';

export async function GET(
  req: NextRequest,
  { params }: { params: { guildId: string } }
) {
  const guildValidation = SnowflakeSchema.safeParse(params.guildId);
  if (!guildValidation.success) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_GUILD_ID', message: 'Invalid Discord guild ID' } },
      { status: 400 }
    );
  }

  const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
  const queryValidation = CaseFilterSchema.safeParse(searchParams);

  if (!queryValidation.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: queryValidation.error.format(),
        },
      },
      { status: 400 }
    );
  }

  const query = queryValidation.data;
  const page = query.page;
  const pageSize = query.pageSize;
  const skip = (page - 1) * pageSize;

  const where: any = { guildId: params.guildId };
  if (query.targetUserId) where.targetUserId = query.targetUserId;
  if (query.moderatorUserId) where.moderatorUserId = query.moderatorUserId;
  if (query.type) where.type = query.type;
  if (query.status) where.status = query.status;

  try {
    const [items, total] = await Promise.all([
      prisma.moderationCase.findMany({
        where,
        orderBy: { caseNumber: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.moderationCase.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to query moderation cases from database',
        },
      },
      { status: 500 }
    );
  }
}
