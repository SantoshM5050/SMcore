import { NextResponse } from 'next/server';
import { prisma, StaffPermission, AuditAction } from '@repo/database';
import { AuthService } from '@/lib/auth';
import { logDashboardAudit } from '@/lib/auditLogger';
import { z } from 'zod';

const staffSchema = z.object({
  roleId: z.string().min(1),
  roleName: z.string().min(1),
  roleColor: z.string().optional().default('#5865F2'),
  permissions: z.array(z.nativeEnum(StaffPermission)).min(1),
});

export async function GET(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;

  const staffRoles = await prisma.staffRole.findMany({
    where: { guildId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(staffRoles);
}

export async function POST(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;
  const body = await request.json().catch(() => ({}));
  const validation = staffSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
  }

  const data = validation.data;

  const staffRole = await prisma.staffRole.upsert({
    where: {
      guildId_roleId: {
        guildId,
        roleId: data.roleId,
      },
    },
    update: {
      roleName: data.roleName,
      roleColor: data.roleColor,
      permissions: data.permissions,
    },
    create: {
      guildId,
      roleId: data.roleId,
      roleName: data.roleName,
      roleColor: data.roleColor,
      permissions: data.permissions,
    },
  });

  await logDashboardAudit(
    guildId,
    user.discordId,
    `${user.username}#${user.discriminator}`,
    AuditAction.STAFF_UPDATED,
    {
      roleId: data.roleId,
      roleName: data.roleName,
      permissions: data.permissions,
      actionType: 'UPSERT',
    }
  );

  return NextResponse.json(staffRole);
}

export async function DELETE(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing staff role ID' }, { status: 400 });
  }

  const deleted = await prisma.staffRole.delete({
    where: { id },
  });

  await logDashboardAudit(
    guildId,
    user.discordId,
    `${user.username}#${user.discriminator}`,
    AuditAction.STAFF_UPDATED,
    {
      roleId: deleted.roleId,
      roleName: deleted.roleName,
      actionType: 'DELETE',
    }
  );

  return NextResponse.json(deleted);
}
