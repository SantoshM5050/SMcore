import { SessionUser, SessionGuild } from './session';

// ------------------------------------------------------------
// Discord OAuth2 constants
// ------------------------------------------------------------
const DISCORD_API_BASE = 'https://discord.com/api/v10';
const DISCORD_CDN_BASE = 'https://cdn.discordapp.com';

// Required OAuth2 scopes
const OAUTH_SCOPES = ['identify', 'guilds'].join(' ');

// Discord permission bits
export const DiscordPermissions = {
  ADMINISTRATOR: BigInt(0x8),
  MANAGE_GUILD: BigInt(0x20),
} as const;

// ------------------------------------------------------------
// Typed Discord API response shapes
// ------------------------------------------------------------
export interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface DiscordUserResponse {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
  discriminator: string;
  email?: string;
}

export interface DiscordGuildResponse {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string; // BigInt permission bits as string
  features: string[];
}

// ------------------------------------------------------------
// OAuth2 URL builder
// ------------------------------------------------------------
export function buildAuthorizationUrl(state: string): string {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId) throw new Error('DISCORD_CLIENT_ID is not configured');
  if (!redirectUri) throw new Error('DISCORD_REDIRECT_URI is not configured');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: OAUTH_SCOPES,
    state,
    prompt: 'none', // Skip consent screen if already authorized
  });

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

// ------------------------------------------------------------
// Token exchange (server-side only — never exposed to browser)
// ------------------------------------------------------------
export async function exchangeCodeForToken(code: string): Promise<DiscordTokenResponse> {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId) throw new Error('DISCORD_CLIENT_ID is not configured');
  if (!clientSecret) throw new Error('DISCORD_CLIENT_SECRET is not configured');
  if (!redirectUri) throw new Error('DISCORD_REDIRECT_URI is not configured');

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    throw new Error(`Discord token exchange failed (${response.status}): ${text}`);
  }

  const data = await response.json() as DiscordTokenResponse;

  if (!data.access_token) {
    throw new Error('Discord token exchange returned invalid response');
  }

  return data;
}

// ------------------------------------------------------------
// Discord API calls (server-side only)
// ------------------------------------------------------------
export async function fetchDiscordUser(accessToken: string): Promise<DiscordUserResponse> {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    // No cache — always fresh
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Discord user (${response.status})`);
  }

  const user = await response.json() as DiscordUserResponse;

  if (!user.id || !user.username) {
    throw new Error('Discord returned invalid user object');
  }

  return user;
}

export async function fetchDiscordGuilds(accessToken: string): Promise<DiscordGuildResponse[]> {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Discord guilds (${response.status})`);
  }

  const guilds = await response.json() as DiscordGuildResponse[];

  if (!Array.isArray(guilds)) {
    throw new Error('Discord returned invalid guilds list');
  }

  return guilds;
}

// ------------------------------------------------------------
// Permission helpers
// ------------------------------------------------------------

/**
 * Returns true if the user has MANAGE_GUILD or ADMINISTRATOR permission
 * OR is the guild owner. This is the SMCore authorization threshold.
 */
export function hasManageGuildPermission(guild: DiscordGuildResponse): boolean {
  if (guild.owner) return true;

  try {
    const perms = BigInt(guild.permissions);
    const hasAdmin = (perms & DiscordPermissions.ADMINISTRATOR) === DiscordPermissions.ADMINISTRATOR;
    const hasManage = (perms & DiscordPermissions.MANAGE_GUILD) === DiscordPermissions.MANAGE_GUILD;
    return hasAdmin || hasManage;
  } catch {
    return false;
  }
}

/**
 * Filter Discord guilds list to only those the user can manage.
 */
export function filterManageableGuilds(guilds: DiscordGuildResponse[]): DiscordGuildResponse[] {
  return guilds.filter(hasManageGuildPermission);
}

// ------------------------------------------------------------
// Map Discord API response to session types
// ------------------------------------------------------------
export function mapDiscordUser(user: DiscordUserResponse): SessionUser {
  return {
    id: user.id,
    username: user.username,
    globalName: user.global_name,
    avatar: user.avatar,
    discriminator: user.discriminator,
  };
}

export function mapDiscordGuild(guild: DiscordGuildResponse): SessionGuild {
  return {
    id: guild.id,
    name: guild.name,
    icon: guild.icon,
    owner: guild.owner,
    permissions: guild.permissions,
  };
}

// ------------------------------------------------------------
// Bot install URL
// ------------------------------------------------------------
export function getBotInstallUrl(): string {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) return '#';

  const params = new URLSearchParams({
    client_id: clientId,
    permissions: '8', // ADMINISTRATOR — matches existing bot setup
    scope: 'bot applications.commands',
  });

  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

// ------------------------------------------------------------
// Avatar URL helper (no sensitive data, safe to call from any context)
// ------------------------------------------------------------
export function discordAvatarUrl(userId: string, avatarHash: string | null): string | null {
  if (!avatarHash) return null;
  return `${DISCORD_CDN_BASE}/avatars/${userId}/${avatarHash}.webp?size=128`;
}

export function discordGuildIconUrl(guildId: string, iconHash: string | null): string | null {
  if (!iconHash) return null;
  return `${DISCORD_CDN_BASE}/icons/${guildId}/${iconHash}.webp?size=64`;
}
