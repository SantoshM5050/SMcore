import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@smcore/database';
import { SnowflakeSchema } from '@smcore/shared';
import { authorizeGuildAccess } from '@/lib/auth/authorize';

export async function GET(
  req: NextRequest,
  { params }: { params: { guildId: string; ticketId: string } }
) {
  const authResult = await authorizeGuildAccess(req, params.guildId);
  if (!authResult.authorized) return authResult.response;

  try {
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: params.ticketId,
        guildId: params.guildId,
      },
      include: {
        category: true,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found in this guild' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: ticket,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DATABASE_OFFLINE',
          message: 'Failed to retrieve ticket record from database',
        },
      },
      { status: 503 }
    );
  }
}
