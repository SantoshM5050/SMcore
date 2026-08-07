import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth';
import { StaffPermissionLevel, AuditAction } from '@repo/database';
import { logDashboardAudit } from '@/lib/auditLogger';
import { z } from 'zod';

const staffSchema = z.object({
  roleId: z.string(),
  roleName: z.string(),
  permissionLevel: z.enum(['HIGH_COMMAND', 'ROLE_REQUEST_MANAGER']),
});

export async function GET(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;

  const staffPermissions = await prisma.staffPermission.findMany({
    where: { guildId },
  });

  return NextResponse.json(staffPermissions);
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
  const permLevel = data.permissionLevel as StaffPermissionLevel;

  const staffPerm = await prisma.staffPermission.upsert({
    where: {
      guildId_roleId_permissionLevel: {
        guildId,
        roleId: data.roleId,
        permissionLevel: permLevel,
      },
    },
    update: {
      roleName: data.roleName,
    },
    create: {
      guildId,
      roleId: data.roleId,
      roleName: data.roleName,
      permissionLevel: permLevel,
    },
  });

  await logDashboardAudit(
    guildId,
    user.discordId,
    `${user.username}#${user.discriminator}`,
    AuditAction.PERMISSION_CHANGED,
    {
      roleId: data.roleId,
      roleName: data.roleName,
      permissionLevel: permLevel,
      actionType: 'ADD',
    }
  );

  return NextResponse.json(staffPerm);
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
    return NextResponse.json({ error: 'Missing permission ID' }, { status: 400 });
  }

  const deleted = await prisma.staffPermission.delete({
    where: { id },
  });

  await logDashboardAudit(
    guildId,
    user.discordId,
    `${user.username}#${user.discriminator}`,
    AuditAction.PERMISSION_CHANGED,
    {
      roleId: deleted.roleId,
      roleName: deleted.roleName,
      permissionLevel: deleted.permissionLevel,
      actionType: 'REMOVE',
    }
  );

  return NextResponse.json({ success: true });
}
