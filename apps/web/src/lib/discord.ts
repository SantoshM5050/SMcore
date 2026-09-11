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
  private static getCleanBotToken(): string {
    const rawToken = process.env.DISCORD_BOT_TOKEN || '';
    return rawToken.trim().replace(/^["']|["']$/g, '');
  }

  /**
   * Fetch authenticated user's profile using OAuth Access Token
   */
  static async getUserProfile(accessToken: string): Promise<DiscordUser> {
    const res = await fetch(`${DISCORD_API_BASE}/users/@me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to fetch Discord user profile: ${res.status} - ${errText}`);
    }
    return res.json();
  }

  /**
   * Fetch user's Discord guilds
   */
  static async getUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
    const res = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to fetch user guilds: ${res.status} - ${errText}`);
    }
    return res.json();
  }

  /**
   * Fetch Guild Roles using Bot Token
   */
  static async getGuildRoles(guildId: string): Promise<DiscordRole[]> {
    const botToken = this.getCleanBotToken();
    if (!botToken || botToken === 'YOUR_DISCORD_BOT_TOKEN') {
      throw new Error('DISCORD_BOT_TOKEN is not configured');
    }

    const res = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${botToken}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[DiscordApi] getGuildRoles failed for guild ${guildId}: ${res.status} - ${errText}`);
      throw new Error(`Failed to fetch roles for guild ${guildId}: ${res.status}`);
    }
    return res.json();
  }

  /**
   * Fetch Guild Text Channels using Bot Token
   */
  static async getGuildChannels(guildId: string): Promise<DiscordChannel[]> {
    const botToken = this.getCleanBotToken();
    if (!botToken || botToken === 'YOUR_DISCORD_BOT_TOKEN') {
      throw new Error('DISCORD_BOT_TOKEN is not configured');
    }

    const res = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/channels`, {
      headers: { Authorization: `Bot ${botToken}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[DiscordApi] getGuildChannels failed for guild ${guildId}: ${res.status} - ${errText}`);
      throw new Error(`Failed to fetch channels for guild ${guildId}: ${res.status}`);
    }

    const channels: any[] = await res.json();

    // Filter text channels (type 0 = GUILD_TEXT, type 5 = GUILD_ANNOUNCEMENT, type 15 = GUILD_FORUM)
    return channels
      .filter((c) => c.type === 0 || c.type === 5 || c.type === 15)
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        parentId: c.parent_id || null,
      }));
  }

  /**
   * Set channel slowmode
   */
  static async setSlowmode(channelId: string, seconds: number): Promise<void> {
    const botToken = this.getCleanBotToken();
    if (!botToken) throw new Error('DISCORD_BOT_TOKEN is not configured');

    const res = await fetch(`${DISCORD_API_BASE}/channels/${channelId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rate_limit_per_user: seconds }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to set slowmode: ${res.status} - ${errText}`);
    }
  }

  /**
   * Lock or unlock a channel for @everyone (roleId === guildId)
   */
  static async setChannelLock(channelId: string, guildId: string, lock: boolean): Promise<void> {
    const botToken = this.getCleanBotToken();
    if (!botToken) throw new Error('DISCORD_BOT_TOKEN is not configured');

    // 0x800 = 2048 (SEND_MESSAGES), 0x40000000 = 1073741824 (SEND_MESSAGES_IN_THREADS)
    const SEND_MESSAGES_FLAG = '1073743872';

    const res = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/permissions/${guildId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 0, // role
        allow: lock ? '0' : '0',
        deny: lock ? SEND_MESSAGES_FLAG : '0',
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to lock/unlock channel: ${res.status} - ${errText}`);
    }
  }

  /**
   * Fetch recent messages and bulk delete
   */
  static async purgeMessages(channelId: string, count: number): Promise<number> {
    const botToken = this.getCleanBotToken();
    if (!botToken) throw new Error('DISCORD_BOT_TOKEN is not configured');

    const fetchRes = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages?limit=${Math.min(count, 100)}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!fetchRes.ok) {
      throw new Error(`Failed to fetch channel messages: ${fetchRes.status}`);
    }

    const messages: any[] = await fetchRes.json();
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const messageIds = messages
      .filter((m) => new Date(m.timestamp).getTime() > twoWeeksAgo)
      .map((m) => m.id);

    if (messageIds.length === 0) return 0;

    if (messageIds.length === 1) {
      await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages/${messageIds[0]}`, {
        method: 'DELETE',
        headers: { Authorization: `Bot ${botToken}` },
      });
      return 1;
    }

    const delRes = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages/bulk-delete`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: messageIds }),
    });

    if (!delRes.ok) {
      const err = await delRes.text();
      throw new Error(`Bulk delete failed: ${delRes.status} - ${err}`);
    }

    return messageIds.length;
  }
}

