import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@smcore/database';
import { SnowflakeSchema, TicketCategoryUpdateSchema } from '@smcore/shared';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { guildId: string; categoryId: string } }
) {
  const guildValidation = SnowflakeSchema.safeParse(params.guildId);
  if (!guildValidation.success) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_GUILD_ID', message: 'Invalid Discord guild ID' } },
      { status: 400 }
    );
  }

  try {
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
  } catch (err: any) {
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
  _req: NextRequest,
  { params }: { params: { guildId: string; categoryId: string } }
) {
  const guildValidation = SnowflakeSchema.safeParse(params.guildId);
  if (!guildValidation.success) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_GUILD_ID', message: 'Invalid Discord guild ID' } },
      { status: 400 }
    );
  }

  try {
    await prisma.ticketCategory.delete({
      where: { id: params.categoryId },
    });

    return NextResponse.json({
      success: true,
      data: { id: params.categoryId, deleted: true },
    });
  } catch (err: any) {
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
