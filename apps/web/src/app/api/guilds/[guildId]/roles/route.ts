import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { DiscordApi } from '@/lib/discord';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;

  try {
    const discordRoles = await DiscordApi.getGuildRoles(guildId);
    const roles = discordRoles
      .filter((r) => !r.managed && r.name !== '@everyone')
      .map((r) => ({
        id: r.id,
        roleId: r.id,
        name: r.name,
        roleName: r.name,
        color: r.color === 0 ? '#99AAB5' : `#${r.color.toString(16).padStart(6, '0')}`,
        position: r.position,
      }));

    return NextResponse.json(roles);
  } catch (err: any) {
    console.warn(`Could not sync Discord live roles for guild ${guildId}:`, err);
    return NextResponse.json([]);
  }
}
