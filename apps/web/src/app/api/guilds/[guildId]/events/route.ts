import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth';
import { z } from 'zod';
import { EventSignupStatus } from '@repo/database';

export const dynamic = 'force-dynamic';

const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  maxMainTeam: z.number().int().min(1).default(10),
  maxSubstitutes: z.number().int().min(0).default(5),
  channelId: z.string().min(1, 'Channel is required'),
  embedColor: z.string().optional().default('#E74C3C'),
  scheduledAt: z.string().nullable().optional(),
  isRecurring: z.boolean().optional().default(false),
  recurringIntervalHours: z.number().int().nullable().optional(),
  postNow: z.boolean().optional().default(true),
});

const batchCreateSchema = z.object({
  events: z.array(createEventSchema),
});

export async function GET(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;

  try {
    const events = await prisma.eventSignup.findMany({
      where: { guildId },
      include: {
        participants: {
          orderBy: { joinedAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(events);
  } catch (err: any) {
    console.error('Error fetching event signups from DB:', err);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;
  const body = await request.json().catch(() => ({}));

  try {
    // Check if batch creation
    if (Array.isArray(body.events)) {
      const validation = batchCreateSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
      }

      const createdEvents = [];
      for (const item of validation.data.events) {
        const scheduledDate = item.scheduledAt ? new Date(item.scheduledAt) : null;
        const initialStatus = item.postNow || !scheduledDate
          ? EventSignupStatus.OPEN
          : EventSignupStatus.SCHEDULED;

        const event = await prisma.eventSignup.create({
          data: {
            guildId,
            title: item.title,
            description: item.description || `Register for ${item.title}`,
            maxMainTeam: item.maxMainTeam,
            maxSubstitutes: item.maxSubstitutes,
            channelId: item.channelId,
            embedColor: item.embedColor || '#E74C3C',
            scheduledAt: scheduledDate,
            isRecurring: item.isRecurring ?? false,
            recurringIntervalHours: item.recurringIntervalHours || null,
            status: initialStatus,
            createdBy: user.discordId,
          },
        });
        createdEvents.push(event);
      }

      return NextResponse.json({ success: true, count: createdEvents.length, events: createdEvents });
    }

    // Single event creation
    const validation = createEventSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    const data = validation.data;
    const scheduledDate = data.scheduledAt ? new Date(data.scheduledAt) : null;
    const initialStatus = data.postNow || !scheduledDate
      ? EventSignupStatus.OPEN
      : EventSignupStatus.SCHEDULED;

    const event = await prisma.eventSignup.create({
      data: {
        guildId,
        title: data.title,
        description: data.description || `Register for ${data.title}`,
        maxMainTeam: data.maxMainTeam,
        maxSubstitutes: data.maxSubstitutes,
        channelId: data.channelId,
        embedColor: data.embedColor || '#E74C3C',
        scheduledAt: scheduledDate,
        isRecurring: data.isRecurring ?? false,
        recurringIntervalHours: data.recurringIntervalHours || null,
        status: initialStatus,
        createdBy: user.discordId,
      },
      include: {
        participants: true,
      },
    });

    return NextResponse.json(event);
  } catch (err: any) {
    console.error('Error creating event signup:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create event signup in database.' },
      { status: 500 }
    );
  }
}
