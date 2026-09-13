import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@smcore/database';
import { SnowflakeSchema, TicketCategoryCreateSchema } from '@smcore/shared';
import { authorizeGuildAccess } from '@/lib/auth/authorize';

export async function GET(
  req: NextRequest,
  { params }: { params: { guildId: string } }
) {
  const authResult = await authorizeGuildAccess(req, params.guildId);
  if (!authResult.authorized) return authResult.response;

  try {
    const categories = await prisma.ticketCategory.findMany({
      where: { guildId: params.guildId, enabled: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      data: [],
      meta: {
        fallback: true,
        dbOffline: true,
      },
    });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { guildId: string } }
) {
  const authResult = await authorizeGuildAccess(req, params.guildId);
  if (!authResult.authorized) return authResult.response;

  try {
    const body = await req.json();
    const parseResult = TicketCategoryCreateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid ticket category payload',
            details: parseResult.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const created = await prisma.ticketCategory.create({
      data: {
        guildId: params.guildId,
        ...parseResult.data,
      },
    });

    return NextResponse.json({
      success: true,
      data: created,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to create ticket category in database',
        },
      },
      { status: 500 }
    );
  }
}
