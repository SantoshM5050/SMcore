import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, SessionGuild } from '@/lib/auth/session';
import {
  exchangeCodeForToken,
  fetchDiscordUser,
  fetchDiscordGuilds,
  filterManageableGuilds,
  mapDiscordUser,
  mapDiscordGuild,
} from '@/lib/auth/discord';
import { prisma } from '@smcore/database';

// Allowed post-login redirect destinations (open-redirect protection)
const ALLOWED_POST_LOGIN_PATHS = ['/dashboard'];

function safeRedirectPath(input: string | null): string {
  if (!input) return '/dashboard';
  // Reject external URLs and relative tricks
  try {
    const url = new URL(input, 'http://localhost');
    if (ALLOWED_POST_LOGIN_PATHS.some((p) => url.pathname === p || url.pathname.startsWith(p + '/'))) {
      return url.pathname;
    }
  } catch {
    // Ignore invalid URLs
  }
  return '/dashboard';
}

/**
 * GET /api/auth/discord/callback
 *
 * Handles the Discord OAuth2 callback:
 * 1. Validates state (CSRF protection)
 * 2. Handles Discord error responses
 * 3. Exchanges code server-side (token never exposed to browser)
 * 4. Fetches Discord user identity and guild list
 * 5. Filters guilds to only those the user can manage
 * 6. Cross-references with DB to determine bot presence per guild
 * 7. Creates a new authenticated session
 * 8. Redirects to dashboard
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const discordError = searchParams.get('error');

  const responseForSession = new NextResponse();

  // Handle Discord-reported errors (e.g., user denied access)
  if (discordError) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('error', 'access_denied');
    return NextResponse.redirect(loginUrl.toString(), { status: 302 });
  }

  // Validate that both code and state are present
  if (!code || !state) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('error', 'missing_params');
    return NextResponse.redirect(loginUrl.toString(), { status: 302 });
  }

  // Get the existing session to validate state
  const session = await getSessionFromRequest(req, responseForSession);

  // Validate state (CSRF protection)
  // State must match what was stored before the redirect
  const storedState = session.oauthState;

  if (!storedState || storedState !== state) {
    // Clear any partial session
    session.authenticated = false;
    session.oauthState = undefined;
    await session.save();

    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('error', 'invalid_state');
    return NextResponse.redirect(loginUrl.toString(), {
      headers: responseForSession.headers,
      status: 302,
    });
  }

  // Invalidate the state immediately (single-use)
  session.oauthState = undefined;
  await session.save();

  try {
    // Exchange authorization code for access token (server-side only)
    const tokenData = await exchangeCodeForToken(code);

    // Fetch Discord user identity
    const discordUser = await fetchDiscordUser(tokenData.access_token);

    // Fetch Discord guild memberships
    const discordGuilds = await fetchDiscordGuilds(tokenData.access_token);

    // Filter to only guilds the user can manage
    const manageableDiscordGuilds = filterManageableGuilds(discordGuilds);

    // Cross-reference with DB to determine bot presence
    // Only query IDs we care about
    const manageableGuildIds = manageableDiscordGuilds.map((g) => g.id);

    let botPresentMap = new Map<string, boolean>();

    try {
      // Also check live bot bridge for guild list
      const botPort = process.env.BOT_PORT || '3001';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      const botRes = await fetch(`http://localhost:${botPort}/guilds`, {
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeoutId);

      if (botRes && botRes.ok) {
        const botJson = await botRes.json().catch(() => null);
        if (botJson && Array.isArray(botJson.data)) {
          for (const bg of botJson.data as { id: string }[]) {
            if (manageableGuildIds.includes(bg.id)) {
              botPresentMap.set(bg.id, true);
            }
          }
        }
      }
    } catch {
      // Bot offline — fall back to DB
    }

    // Fall back to DB for any guilds not found in bot live list
    if (manageableGuildIds.length > 0) {
      try {
        const dbGuilds = await prisma.guild.findMany({
          where: { id: { in: manageableGuildIds } },
          select: { id: true, botPresent: true },
        });
        for (const dg of dbGuilds) {
          if (!botPresentMap.has(dg.id)) {
            botPresentMap.set(dg.id, dg.botPresent);
          }
        }
      } catch {
        // DB offline — conservative: assume bot not present for unknown guilds
      }
    }

    // Map to session guilds with bot presence info
    const sessionGuilds: (SessionGuild & { botPresent: boolean })[] = manageableDiscordGuilds.map(
      (g) => ({
        ...mapDiscordGuild(g),
        botPresent: botPresentMap.get(g.id) ?? false,
      })
    );

    // Create authenticated session
    // IMPORTANT: access tokens are NOT stored in the session
    const newSession = await getSessionFromRequest(req, responseForSession);
    newSession.authenticated = true;
    newSession.user = mapDiscordUser(discordUser);
    newSession.guilds = sessionGuilds;
    newSession.oauthState = undefined;
    await newSession.save();

    // Redirect to dashboard
    const dashboardUrl = new URL('/dashboard', req.url);
    return NextResponse.redirect(dashboardUrl.toString(), {
      headers: responseForSession.headers,
      status: 302,
    });
  } catch (err) {
    // Clear session on error
    session.authenticated = false;
    session.user = undefined;
    session.guilds = undefined;
    await session.save();

    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('error', 'auth_failed');
    return NextResponse.redirect(loginUrl.toString(), {
      headers: responseForSession.headers,
      status: 302,
    });
  }
}
