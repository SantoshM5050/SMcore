import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@smcore/database';
import {
  SnowflakeSchema,
  AuditEventType,
  AuditAction,
  AuditTargetType,
  AuditLogEntry,
} from '@smcore/shared';

import { authorizeGuildAccess } from '@/lib/auth/authorize';

export async function GET(
  req: NextRequest,
  { params }: { params: { guildId: string; id: string } }
) {
  const authResult = await authorizeGuildAccess(req, params.guildId);
  if (!authResult.authorized) return authResult.response;

  if (!params.id || typeof params.id !== 'string') {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_LOG_ID', message: 'Audit log ID is required' } },
      { status: 400 }
    );
  }

  try {
    const item = await prisma.auditLog.findFirst({
      where: {
        id: params.id,
        guildId: params.guildId, // Strict guild isolation
      },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Audit log entry not found' } },
        { status: 404 }
      );
    }

    const data: AuditLogEntry = {
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
    };

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database offline or query error' } },
      { status: 500 }
    );
  }
}
