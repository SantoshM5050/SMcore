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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { guildId: string; ticketId: string } }
) {
  const authResult = await authorizeGuildAccess(req, params.guildId);
  if (!authResult.authorized) return authResult.response;

  try {
    const body = await req.json();
    const { status, claimedByUserId, closeReason } = body;

    const data: any = { updatedAt: new Date() };
    if (status) data.status = status;
    if (claimedByUserId !== undefined) data.claimedByUserId = claimedByUserId;
    if (status === 'CLOSED') {
      data.closedAt = new Date().toISOString();
      data.closedByUserId = authResult.userId || '123456789012345678';
    }

    const updated = await prisma.ticket.update({
      where: { id: params.ticketId },
      data,
    });

    await prisma.auditLog.create({
      data: {
        guildId: params.guildId,
        eventType: 'TICKETS',
        action: status === 'CLAIMED' ? 'TICKET_CLAIM' : status === 'CLOSED' ? 'TICKET_CLOSE' : 'TICKET_UPDATE',
        actorUserId: authResult.userId || '123456789012345678',
        reason: closeReason || `Ticket status updated to ${status}`,
        metadata: { ticketId: params.ticketId, ticketNumber: updated.ticketNumber },
      },
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
          code: 'UPDATE_FAILED',
          message: err?.message || 'Failed to update ticket status',
        },
      },
      { status: 500 }
    );
  }
}
