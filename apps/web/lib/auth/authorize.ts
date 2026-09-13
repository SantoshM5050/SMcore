import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, SessionGuild } from './session';
import { DiscordPermissions } from './discord';

// ------------------------------------------------------------
// Authorization result type
// ------------------------------------------------------------
export type AuthorizationSuccess = {
  authorized: true;
  userId: string;
  guildId: string;
  guild: SessionGuild;
  botPresent: boolean;
};

export type AuthorizationFailure = {
  authorized: false;
  reason:
    | 'UNAUTHENTICATED'
    | 'INVALID_GUILD_ID'
    | 'GUILD_NOT_FOUND'
    | 'INSUFFICIENT_PERMISSION'
    | 'BOT_NOT_INSTALLED';
  response: NextResponse;
};

export type AuthorizationResult = AuthorizationSuccess | AuthorizationFailure;

// ------------------------------------------------------------
// Snowflake validation regex
// ------------------------------------------------------------
const SNOWFLAKE_RE = /^\d{17,20}$/;

// ------------------------------------------------------------
// Guild permission check (same logic as discord.ts, kept local
// to avoid circular imports)
// ------------------------------------------------------------
function sessionGuildHasPermission(guild: SessionGuild): boolean {
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

// ------------------------------------------------------------
// Centralized guild authorization service
// ------------------------------------------------------------

/**
 * Authorize a guild-scoped API request.
 *
 * Flow:
 * 1. Validate guildId format (Snowflake)
 * 2. Read session from request
 * 3. Verify user is authenticated
 * 4. Find guildId in user's authorized Discord guild list (from session)
 * 5. Verify user has MANAGE_GUILD, ADMINISTRATOR, or owner flag
 * 6. (Optional) check bot presence from session metadata
 *
 * The bot presence check is advisory — we still allow the request through
 * (the API route will naturally fail if the bot is not present), but the
 * result indicates bot status for upstream logic.
 *
 * @param req - The incoming NextRequest
 * @param guildId - The guild ID from the URL parameter
 * @param requireBot - If true, returns BOT_NOT_INSTALLED when bot is not present
 */
export async function authorizeGuildAccess(
  req: NextRequest,
  guildId: string,
  requireBot = false
): Promise<AuthorizationResult> {
  // 1. Validate guildId format
  if (!SNOWFLAKE_RE.test(guildId)) {
    return {
      authorized: false,
      reason: 'INVALID_GUILD_ID',
      response: NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_GUILD_ID', message: 'Invalid Discord Guild ID format' },
        },
        { status: 400 }
      ),
    };
  }

  // 2. Get session
  const res = new NextResponse();
  const session = await getSessionFromRequest(req, res);

  // 3. Verify authentication
  if (!session.authenticated || !session.user) {
    return {
      authorized: false,
      reason: 'UNAUTHENTICATED',
      response: NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHENTICATED', message: 'Authentication required' },
        },
        { status: 401 }
      ),
    };
  }

  const sessionGuilds = session.guilds ?? [];

  // 4. Find guild in user's authorized list (IDOR protection)
  const guild = sessionGuilds.find((g) => g.id === guildId);

  if (!guild) {
    // User does not have this guild in their Discord guild list,
    // OR they are not a manager of it. Either way: 403.
    return {
      authorized: false,
      reason: 'GUILD_NOT_FOUND',
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this server',
          },
        },
        { status: 403 }
      ),
    };
  }

  // 5. Verify permission threshold
  if (!sessionGuildHasPermission(guild)) {
    return {
      authorized: false,
      reason: 'INSUFFICIENT_PERMISSION',
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSION',
            message: 'You need Manage Server or Administrator permission to access this dashboard',
          },
        },
        { status: 403 }
      ),
    };
  }

  // 6. Check bot presence if required
  // Note: botPresent is determined by cross-referencing with DB at login time
  // We store it in the session guild metadata
  const botPresent = (guild as SessionGuild & { botPresent?: boolean }).botPresent ?? true;

  if (requireBot && !botPresent) {
    return {
      authorized: false,
      reason: 'BOT_NOT_INSTALLED',
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: 'BOT_NOT_INSTALLED',
            message: 'SMCore is not installed on this server',
          },
        },
        { status: 404 }
      ),
    };
  }

  return {
    authorized: true,
    userId: session.user.id,
    guildId,
    guild,
    botPresent,
  };
}

// ------------------------------------------------------------
// Simple session authentication check for non-guild routes
// ------------------------------------------------------------
export async function requireAuth(
  req: NextRequest
): Promise<
  | { authenticated: true; userId: string }
  | { authenticated: false; response: NextResponse }
> {
  const res = new NextResponse();
  const session = await getSessionFromRequest(req, res);

  if (!session.authenticated || !session.user) {
    return {
      authenticated: false,
      response: NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHENTICATED', message: 'Authentication required' },
        },
        { status: 401 }
      ),
    };
  }

  return { authenticated: true, userId: session.user.id };
}
