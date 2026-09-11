import { NextResponse } from 'next/server';
import { prisma, ModerationAction, StaffPermission } from '@repo/database';
import { AuthService } from '@/lib/auth';
import { RbacService } from '@/lib/rbac';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createCaseSchema = z.object({
  targetId: z.string().min(1),
  targetTag: z.string().min(1),
  action: z.nativeEnum(ModerationAction),
  reason: z.string().optional().default('No reason provided'),
  durationMinutes: z.number().int().optional(),
});

export async function GET(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;
  const { searchParams } = new URL(request.url);
  const actionFilter = searchParams.get('action');
  const query = searchParams.get('q');
  const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '25', 10), 1), 100);

  const whereClause: any = { guildId };

  if (actionFilter && Object.values(ModerationAction).includes(actionFilter as any)) {
    whereClause.action = actionFilter;
  }

  if (query) {
    whereClause.OR = [
      { targetTag: { contains: query, mode: 'insensitive' } },
      { targetId: { contains: query } },
      { moderatorTag: { contains: query, mode: 'insensitive' } },
      { reason: { contains: query, mode: 'insensitive' } },
    ];
  }

  const [total, cases] = await Promise.all([
    prisma.moderationCase.count({ where: whereClause }),
    prisma.moderationCase.findMany({
      where: whereClause,
      orderBy: { caseNumber: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    cases,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;
  const perms = await RbacService.checkUserPermissions(user.discordId, guildId);

  const body = await request.json().catch(() => ({}));
  const validation = createCaseSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
  }

  const data = validation.data;

  // Permission checks by action
  if (data.action === ModerationAction.BAN && !perms.hasPermission(StaffPermission.BAN_MEMBERS)) {
    return NextResponse.json({ error: 'Forbidden: Missing BAN_MEMBERS permission' }, { status: 403 });
  }
  if (data.action === ModerationAction.KICK && !perms.hasPermission(StaffPermission.KICK_MEMBERS)) {
    return NextResponse.json({ error: 'Forbidden: Missing KICK_MEMBERS permission' }, { status: 403 });
  }
  if (data.action === ModerationAction.TIMEOUT && !perms.hasPermission(StaffPermission.TIMEOUT_MEMBERS)) {
    return NextResponse.json({ error: 'Forbidden: Missing TIMEOUT_MEMBERS permission' }, { status: 403 });
  }
  if (data.action === ModerationAction.WARN && !perms.hasPermission(StaffPermission.WARN_MEMBERS)) {
    return NextResponse.json({ error: 'Forbidden: Missing WARN_MEMBERS permission' }, { status: 403 });
  }

  const lastCase = await prisma.moderationCase.findFirst({
    where: { guildId },
    orderBy: { caseNumber: 'desc' },
    select: { caseNumber: true },
  });
  const caseNumber = (lastCase?.caseNumber || 0) + 1;

  const newCase = await prisma.moderationCase.create({
    data: {
      guildId,
      caseNumber,
      targetId: data.targetId,
      targetTag: data.targetTag,
      moderatorId: user.discordId,
      moderatorTag: `${user.username}#${user.discriminator}`,
      action: data.action,
      reason: data.reason,
      durationMinutes: data.durationMinutes || null,
    },
  });

  return NextResponse.json(newCase);
}
