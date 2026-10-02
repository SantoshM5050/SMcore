import { NextRequest, NextResponse } from 'next/server';
import { authorizeGuildAccess } from '@/lib/auth/authorize';

interface RouteContext {
  params: { guildId: string };
}

export interface GuildRole {
  id: string;
  name: string;
  color: string;
  position: number;
  membersCount: number;
  permissions: string;
  isAdministrator: boolean;
  isModerator: boolean;
  autoModBypass: boolean;
  isMuteRole: boolean;
  isQuarantineRole: boolean;
}

let rolesStore: Record<string, GuildRole[]> = {};

function getDefaultRoles(guildId: string): GuildRole[] {
  return [
    {
      id: 'role-admin',
      name: 'Server Admin',
      color: '#6366f1',
      position: 10,
      membersCount: 2,
      permissions: '8', // ADMINISTRATOR
      isAdministrator: true,
      isModerator: true,
      autoModBypass: true,
      isMuteRole: false,
      isQuarantineRole: false,
    },
    {
      id: 'role-lead-mod',
      name: 'Head Moderator',
      color: '#10b981',
      position: 8,
      membersCount: 4,
      permissions: '268435456', // MANAGE_MESSAGES + KICK + BAN
      isAdministrator: false,
      isModerator: true,
      autoModBypass: true,
      isMuteRole: false,
      isQuarantineRole: false,
    },
    {
      id: 'role-mod',
      name: 'Trial Moderator',
      color: '#38bdf8',
      position: 6,
      membersCount: 6,
      permissions: '1099511627776', // MODERATE_MEMBERS
      isAdministrator: false,
      isModerator: true,
      autoModBypass: false,
      isMuteRole: false,
      isQuarantineRole: false,
    },
    {
      id: 'role-vip',
      name: 'Server Booster & VIP',
      color: '#ec4899',
      position: 4,
      membersCount: 38,
      permissions: '0',
      isAdministrator: false,
      isModerator: false,
      autoModBypass: false,
      isMuteRole: false,
      isQuarantineRole: false,
    },
    {
      id: 'role-verified',
      name: 'Verified Citizen',
      color: '#94a3b8',
      position: 2,
      membersCount: 1420,
      permissions: '0',
      isAdministrator: false,
      isModerator: false,
      autoModBypass: false,
      isMuteRole: false,
      isQuarantineRole: false,
    },
    {
      id: 'role-muted',
      name: 'Muted / Silenced',
      color: '#64748b',
      position: 1,
      membersCount: 3,
      permissions: '0',
      isAdministrator: false,
      isModerator: false,
      autoModBypass: false,
      isMuteRole: true,
      isQuarantineRole: false,
    },
    {
      id: 'role-quarantine',
      name: 'Quarantined Threat',
      color: '#f43f5e',
      position: 0,
      membersCount: 1,
      permissions: '0',
      isAdministrator: false,
      isModerator: false,
      autoModBypass: false,
      isMuteRole: false,
      isQuarantineRole: true,
    },
  ];
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { guildId } = params;

  const authResult = await authorizeGuildAccess(req, guildId);
  if (!authResult.authorized) {
    return authResult.response;
  }

  if (!rolesStore[guildId]) {
    rolesStore[guildId] = getDefaultRoles(guildId);
  }

  return NextResponse.json({
    success: true,
    data: rolesStore[guildId],
  });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { guildId } = params;

  const authResult = await authorizeGuildAccess(req, guildId);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { roleId, autoModBypass, isModerator } = await req.json();
    if (!rolesStore[guildId]) {
      rolesStore[guildId] = getDefaultRoles(guildId);
    }

    const role = rolesStore[guildId].find((r) => r.id === roleId);
    if (role) {
      if (typeof autoModBypass === 'boolean') role.autoModBypass = autoModBypass;
      if (typeof isModerator === 'boolean') role.isModerator = isModerator;
    }

    return NextResponse.json({
      success: true,
      data: rolesStore[guildId],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: 'Failed to update role settings' } },
      { status: 500 }
    );
  }
}
