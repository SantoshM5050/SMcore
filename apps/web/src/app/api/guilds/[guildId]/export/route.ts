import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;

  const [guild, settings, channels, roles, staff, embeds] = await Promise.all([
    prisma.guild.findUnique({ where: { id: guildId } }),
    prisma.guildSettings.findUnique({ where: { guildId } }),
    prisma.channelConfiguration.findUnique({ where: { guildId } }),
    prisma.roleConfiguration.findMany({ where: { guildId } }),
    prisma.staffPermission.findMany({ where: { guildId } }),
    prisma.embedConfig.findFirst({ where: { guildId } }),
  ]);

  const configExport = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    guildId,
    guildName: guild?.name || 'Discord Server',
    settings,
    channels,
    roles,
    staff,
    embeds,
  };

  return new NextResponse(JSON.stringify(configExport, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename=server_config_${guildId}_backup.json`,
    },
  });
}
