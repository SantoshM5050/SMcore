import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth';
import { EventSignupStatus } from '@repo/database';
import { sendOrUpdateEventDiscordEmbed } from '@/lib/discordEventEmbed';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: { guildId: string; eventId: string } }
) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId, eventId } = params;
  const body = await request.json().catch(() => ({}));

  const updated = await prisma.eventSignup.update({
    where: { id: eventId, guildId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.eventTime !== undefined && { eventTime: body.eventTime }),
      ...(body.maxMainTeam !== undefined && { maxMainTeam: Number(body.maxMainTeam) }),
      ...(body.maxSubstitutes !== undefined && { maxSubstitutes: Number(body.maxSubstitutes) }),
      ...(body.channelId !== undefined && { channelId: body.channelId }),
      ...(body.pingRoleId !== undefined && { pingRoleId: body.pingRoleId || null }),
      ...(body.embedColor !== undefined && { embedColor: body.embedColor }),
      ...(body.status !== undefined && { status: body.status as EventSignupStatus }),
      ...(body.isRecurring !== undefined && { isRecurring: Boolean(body.isRecurring) }),
      ...(body.recurringIntervalHours !== undefined && { recurringIntervalHours: body.recurringIntervalHours ? Number(body.recurringIntervalHours) : null }),
      ...(body.autoCloseMinutes !== undefined && { autoCloseMinutes: body.autoCloseMinutes ? Number(body.autoCloseMinutes) : null }),
    },
    include: {
      participants: {
        orderBy: { joinedAt: 'asc' },
      },
    },
  });

  await sendOrUpdateEventDiscordEmbed(updated.id).catch((err) => {
    console.error(`[PATCH Event] Error updating Discord embed:`, err);
  });

  return NextResponse.json(updated);
}

export async function POST(
  request: Request,
  { params }: { params: { guildId: string; eventId: string } }
) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId, eventId } = params;
  const body = await request.json().catch(() => ({}));
  const action = body.action;

  if (action === 'clear') {
    // Clear all participants for this event
    await prisma.eventParticipant.deleteMany({
      where: { eventSignupId: eventId },
    });

    const updated = await prisma.eventSignup.findUnique({
      where: { id: eventId, guildId },
      include: { participants: true },
    });

    await sendOrUpdateEventDiscordEmbed(eventId).catch((err) => {
      console.error(`[Clear Event] Error updating Discord embed:`, err);
    });

    return NextResponse.json({ success: true, message: 'Roster and Substitutes cleared.', event: updated });
  }

  if (action === 'toggle_status') {
    const current = await prisma.eventSignup.findUnique({ where: { id: eventId, guildId } });
    if (!current) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const nextStatus = current.status === EventSignupStatus.OPEN
      ? EventSignupStatus.CLOSED
      : EventSignupStatus.OPEN;

    let newCloseAt = current.closeAt;
    if (nextStatus === EventSignupStatus.OPEN) {
      if (current.autoCloseMinutes && current.autoCloseMinutes > 0) {
        newCloseAt = new Date(Date.now() + current.autoCloseMinutes * 60 * 1000);
      } else {
        newCloseAt = null;
      }
    } else {
      newCloseAt = new Date();
    }

    const updated = await prisma.eventSignup.update({
      where: { id: eventId },
      data: {
        status: nextStatus,
        closeAt: newCloseAt,
      },
      include: { participants: true },
    });

    await sendOrUpdateEventDiscordEmbed(eventId).catch((err) => {
      console.error(`[Toggle Status] Error updating Discord embed:`, err);
    });

    return NextResponse.json({ success: true, status: nextStatus, event: updated });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function DELETE(
  request: Request,
  { params }: { params: { guildId: string; eventId: string } }
) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId, eventId } = params;

  await prisma.eventSignup.delete({
    where: { id: eventId, guildId },
  });

  return NextResponse.json({ success: true, message: 'Event signup deleted.' });
}
