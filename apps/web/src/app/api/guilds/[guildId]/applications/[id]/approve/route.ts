import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth';
import { ApplicationStatus, AuditAction } from '@repo/database';
import { logDashboardAudit } from '@/lib/auditLogger';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { guildId: string; id: string } }
) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId, id } = params;

  const application = await prisma.application.findUnique({
    where: { id },
  });

  if (!application || application.guildId !== guildId) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  if (application.status !== ApplicationStatus.PENDING) {
    return NextResponse.json({ error: 'Application has already been resolved' }, { status: 400 });
  }

  // Update Status in DB
  const updated = await prisma.application.update({
    where: { id },
    data: {
      status: ApplicationStatus.APPROVED,
      reviewerId: user.discordId,
      reviewerTag: `${user.username}#${user.discriminator}`,
    },
  });

  await prisma.applicationHistory.create({
    data: {
      applicationId: id,
      actorId: user.discordId,
      actorTag: `${user.username}#${user.discriminator}`,
      previousStatus: ApplicationStatus.PENDING,
      newStatus: ApplicationStatus.APPROVED,
      reason: 'Approved via Web Dashboard',
    },
  });

  // Assign Discord Role and Change Server Nickname to "Name | ID" via Discord REST API
  const rawToken = process.env.DISCORD_BOT_TOKEN || '';
  const botToken = rawToken.trim().replace(/^["']|["']$/g, '');

  if (botToken && botToken !== 'YOUR_DISCORD_BOT_TOKEN') {
    // 1. Assign Requested Role
    await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${application.userId}/roles/${application.roleId}`, {
      method: 'PUT',
      headers: { Authorization: `Bot ${botToken}` },
    }).catch((err) => console.error('[REST API] Failed to assign role:', err));

    // 1b. Assign Common Role if configured
    const settings = await prisma.guildSettings.findUnique({ where: { guildId } });
    if (settings?.commonRoleId) {
      await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${application.userId}/roles/${settings.commonRoleId}`, {
        method: 'PUT',
        headers: { Authorization: `Bot ${botToken}` },
      }).catch((err) => console.error('[REST API] Failed to assign common role:', err));
    }

    // 2. Change Nickname to "Name | ID"
    let newNick = `${application.inGameName} | ${application.inGameId}`;
    if (newNick.length > 32) newNick = newNick.slice(0, 32);

    await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${application.userId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nick: newNick }),
    }).catch((err) => console.error('[REST API] Failed to update nickname:', err));
  }

  await logDashboardAudit(
    guildId,
    user.discordId,
    `${user.username}#${user.discriminator}`,
    AuditAction.APPLICATION_APPROVED,
    {
      applicationId: id,
      roleName: application.roleName,
      applicantTag: application.userTag,
      source: 'web_dashboard',
    }
  );

  return NextResponse.json(updated);
}
