import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@smcore/database';
import { TicketCategoryUpdateSchema } from '@smcore/shared';
import { authorizeGuildAccess } from '@/lib/auth/authorize';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { guildId: string; categoryId: string } }
) {
  const authResult = await authorizeGuildAccess(req, params.guildId);
  if (!authResult.authorized) return authResult.response;

  try {
    const existing = await prisma.ticketCategory.findFirst({
      where: {
        id: params.categoryId,
        guildId: params.guildId, // Strict guild isolation
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Ticket category not found in this server' } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parseResult = TicketCategoryUpdateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid category update payload',
            details: parseResult.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const updated = await prisma.ticketCategory.update({
      where: { id: params.categoryId },
      data: parseResult.data,
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update category',
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { guildId: string; categoryId: string } }
) {
  const authResult = await authorizeGuildAccess(req, params.guildId);
  if (!authResult.authorized) return authResult.response;

  try {
    const existing = await prisma.ticketCategory.findFirst({
      where: {
        id: params.categoryId,
        guildId: params.guildId, // Strict guild isolation
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Ticket category not found in this server' } },
        { status: 404 }
      );
    }

    await prisma.ticketCategory.delete({
      where: { id: params.categoryId },
    });

    return NextResponse.json({
      success: true,
      data: { id: params.categoryId, deleted: true },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to delete category from database',
        },
      },
      { status: 500 }
    );
  }
}
