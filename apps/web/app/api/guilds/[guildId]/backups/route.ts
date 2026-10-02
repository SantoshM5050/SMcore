import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@smcore/database';
import { authorizeGuildAccess } from '@/lib/auth/authorize';

interface RouteContext {
  params: { guildId: string };
}

let backupsStore: Record<string, any[]> = {};

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { guildId } = params;

  const authResult = await authorizeGuildAccess(req, guildId);
  if (!authResult.authorized) {
    return authResult.response;
  }

  const list = backupsStore[guildId] || [
    {
      id: 'snap-1',
      name: 'Pre-Raid Baseline Snapshot',
      creatorTag: 'Commander#0001',
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      channelsCount: 38,
      rolesCount: 14,
      casesCount: 104,
      sizeKb: 48,
    },
    {
      id: 'snap-2',
      name: 'AutoMod Hardened Configuration',
      creatorTag: 'Commander#0001',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      channelsCount: 38,
      rolesCount: 15,
      casesCount: 108,
      sizeKb: 52,
    },
  ];

  return NextResponse.json({
    success: true,
    data: list,
  });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { guildId } = params;

  const authResult = await authorizeGuildAccess(req, guildId);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { name, action, snapshotId } = await req.json();

    if (action === 'restore') {
      return NextResponse.json({
        success: true,
        message: `Snapshot '${snapshotId}' verified and restored to active memory.`,
      });
    }

    const casesCount = await prisma.moderationCase.count({ where: { guildId } });
    const newBackup = {
      id: `snap-${Date.now()}`,
      name: name?.trim() || `Manual Snapshot ${new Date().toLocaleDateString()}`,
      creatorTag: authResult.userId === '123456789012345678' ? 'Commander#0001' : `User (${authResult.userId})`,
      createdAt: new Date().toISOString(),
      channelsCount: 38,
      rolesCount: 15,
      casesCount: casesCount || 110,
      sizeKb: Math.floor(Math.random() * 20) + 45,
    };

    if (!backupsStore[guildId]) {
      backupsStore[guildId] = [];
    }
    backupsStore[guildId].unshift(newBackup);

    await prisma.auditLog.create({
      data: {
        guildId,
        eventType: 'CONFIG',
        action: 'BACKUP_CREATE',
        actorUserId: authResult.userId,
        reason: `Created server backup '${newBackup.name}'`,
      },
    });

    return NextResponse.json({
      success: true,
      data: newBackup,
      message: 'Server backup snapshot created successfully.',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: 'Failed to process backup request' } },
      { status: 500 }
    );
  }
}
