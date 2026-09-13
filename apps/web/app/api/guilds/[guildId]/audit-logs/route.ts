import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@smcore/database';
import {
  SnowflakeSchema,
  AuditLogQuerySchema,
  AuditEventType,
  AuditAction,
  AuditTargetType,
  AuditLogEntry,
} from '@smcore/shared';
import { authorizeGuildAccess } from '@/lib/auth/authorize';

export async function GET(
  req: NextRequest,
  { params }: { params: { guildId: string } }
) {
  const authResult = await authorizeGuildAccess(req, params.guildId);
  if (!authResult.authorized) return authResult.response;

  const { searchParams } = new URL(req.url);
  const rawQuery = {
    cursor: searchParams.get('cursor') || undefined,
    limit: searchParams.get('limit') || undefined,
    eventType: searchParams.get('eventType') || undefined,
    action: searchParams.get('action') || undefined,
    actorUserId: searchParams.get('actorUserId') || undefined,
    targetUserId: searchParams.get('targetUserId') || undefined,
    channelId: searchParams.get('channelId') || undefined,
    caseId: searchParams.get('caseId') || undefined,
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
  };

  const queryValidation = AuditLogQuerySchema.safeParse(rawQuery);
  if (!queryValidation.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid audit log query parameters',
          details: queryValidation.error.format(),
        },
      },
      { status: 400 }
    );
  }

  const query = queryValidation.data;
  const limit = query.limit;

  const where: Record<string, unknown> = {
    guildId: params.guildId,
  };

  if (query.eventType) where.eventType = query.eventType;
  if (query.action) where.action = query.action;
  if (query.actorUserId) where.actorUserId = query.actorUserId;
  if (query.targetUserId) where.targetUserId = query.targetUserId;
  if (query.channelId) where.channelId = query.channelId;
  if (query.caseId) where.caseId = query.caseId;

  if (query.from || query.to) {
    const createdAtFilter: Record<string, Date> = {};
    if (query.from) createdAtFilter.gte = query.from;
    if (query.to) createdAtFilter.lte = query.to;
    where.createdAt = createdAtFilter;
  }

  try {
    const items = await prisma.auditLog.findMany({
      where,
      take: limit + 1,
      ...(query.cursor
        ? {
            cursor: { id: query.cursor },
            skip: 1,
          }
        : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    let nextCursor: string | null = null;
    if (items.length > limit) {
      const nextItem = items.pop();
      nextCursor = nextItem ? nextItem.id : null;
    }

    const data: AuditLogEntry[] = items.map((item) => ({
      id: item.id,
      guildId: item.guildId,
      eventType: item.eventType as AuditEventType,
      action: item.action as AuditAction,
      actorUserId: item.actorUserId,
      targetUserId: item.targetUserId,
      targetType: (item.targetType as AuditTargetType) ?? undefined,
      channelId: item.channelId,
      caseId: item.caseId,
      reason: item.reason,
      metadata: (item.metadata as Record<string, unknown>) ?? undefined,
      createdAt: item.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data,
      nextCursor,
    });
  } catch (err) {
    return NextResponse.json({
      success: true,
      data: [],
      nextCursor: null,
      meta: { fallback: true, message: 'Database offline or query error' },
    });
  }
}
