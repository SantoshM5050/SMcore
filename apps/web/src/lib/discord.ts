const DISCORD_API_BASE = 'https://discord.com/api/v10';

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  parentId: string | null;
}

export class DiscordApi {
  /**
   * Fetch authenticated user's profile using OAuth Access Token
   */
  static async getUserProfile(accessToken: string): Promise<DiscordUser> {
    const res = await fetch(`${DISCORD_API_BASE}/users/@me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Failed to fetch Discord user profile');
    return res.json();
  }

  /**
   * Fetch user's Discord guilds
   */
  static async getUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
    const res = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Failed to fetch user guilds');
    return res.json();
  }

  /**
   * Fetch Guild Roles using Bot Token
   */
  static async getGuildRoles(guildId: string): Promise<DiscordRole[]> {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) throw new Error('DISCORD_BOT_TOKEN is not configured');

    const res = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!res.ok) throw new Error(`Failed to fetch roles for guild ${guildId}`);
    return res.json();
  }

  /**
   * Fetch Guild Text Channels using Bot Token
   */
  static async getGuildChannels(guildId: string): Promise<DiscordChannel[]> {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) throw new Error('DISCORD_BOT_TOKEN is not configured');

    const res = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/channels`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!res.ok) throw new Error(`Failed to fetch channels for guild ${guildId}`);
    const channels: any[] = await res.json();

    // Filter only text channels (type 0 = GUILD_TEXT, type 5 = GUILD_ANNOUNCEMENT)
    return channels
      .filter((c) => c.type === 0 || c.type === 5)
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        parentId: c.parent_id || null,
      }));
  }
}
