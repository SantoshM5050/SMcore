import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@smcore/database';
import { SnowflakeSchema, TicketFilterQuerySchema } from '@smcore/shared';

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
  const queryValidation = TicketFilterQuerySchema.safeParse(searchParams);

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
  if (query.status) where.status = query.status;
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.creatorUserId) where.creatorUserId = query.creatorUserId;
  if (query.claimedByUserId) where.claimedByUserId = query.claimedByUserId;
  if (query.search) {
    where.OR = [
      { subject: { contains: query.search, mode: 'insensitive' } },
      { creatorUserId: { contains: query.search } },
      { channelId: { contains: query.search } },
    ];
  }

  try {
    const [items, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: { ticketNumber: 'desc' },
        skip,
        take: pageSize,
        include: { category: true },
      }),
      prisma.ticket.count({ where }),
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
        success: true,
        data: {
          items: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        },
        meta: {
          fallback: true,
          dbOffline: true,
          message: 'Database query failed, returning offline fallback structure',
        },
      },
      { status: 200 }
    );
  }
}
