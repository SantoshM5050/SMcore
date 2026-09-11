import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;

  const [
    guild,
    settings,
    staffRoles,
    autoModRules,
    antiSpam,
    antiLink,
    antiInvite,
    antiMention,
    antiRaid,
    joinSecurity,
    logConfigs,
    escalationRules,
  ] = await Promise.all([
    prisma.guild.findUnique({ where: { id: guildId } }),
    prisma.guildSettings.findUnique({ where: { guildId } }),
    prisma.staffRole.findMany({ where: { guildId } }),
    prisma.autoModRule.findMany({ where: { guildId } }),
    prisma.antiSpamConfig.findUnique({ where: { guildId } }),
    prisma.antiLinkConfig.findUnique({ where: { guildId } }),
    prisma.antiInviteConfig.findUnique({ where: { guildId } }),
    prisma.antiMentionConfig.findUnique({ where: { guildId } }),
    prisma.antiRaidConfig.findUnique({ where: { guildId } }),
    prisma.joinSecurityConfig.findUnique({ where: { guildId } }),
    prisma.logConfiguration.findMany({ where: { guildId } }),
    prisma.warningEscalationRule.findMany({ where: { guildId } }),
  ]);

  const configExport = {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    guildId,
    guildName: guild?.name || 'Discord Server',
    settings,
    staffRoles,
    autoModRules,
    antiSpam,
    antiLink,
    antiInvite,
    antiMention,
    antiRaid,
    joinSecurity,
    logConfigs,
    escalationRules,
  };

  return new NextResponse(JSON.stringify(configExport, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename=smcore_config_${guildId}_backup.json`,
    },
  });
}
