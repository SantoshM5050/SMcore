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
    const channels = await DiscordApi.getGuildChannels(guildId);
    return NextResponse.json(channels);
  } catch (err: any) {
    console.warn(`[Channels List API] Could not fetch channels from Discord API for guild ${guildId}:`, err.message);
    return NextResponse.json([]);
  }
}
