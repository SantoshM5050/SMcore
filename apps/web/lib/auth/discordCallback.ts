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
import { getBotApiUrl } from '@/lib/api/botBridgeUrl';

/**
 * Shared Discord OAuth2 callback handler.
 * Used by both /api/auth/discord/callback and /api/auth/callback routes.
 */
export async function handleDiscordCallback(req: NextRequest) {
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
  const storedState = session.oauthState;

  if (!storedState || storedState !== state) {
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
    // Determine the exact redirect URI to use for token exchange
    const requestUrl = new URL(req.url);
    const candidateUri = `${requestUrl.origin}${requestUrl.pathname}`;
    const configuredUri = process.env.DISCORD_REDIRECT_URI;
    const redirectUriToUse = configuredUri && configuredUri.endsWith(requestUrl.pathname)
      ? configuredUri
      : (configuredUri || candidateUri);

    console.log('[OAuth Callback] Beginning token exchange with redirectUri:', redirectUriToUse);

    // Exchange authorization code for access token (server-side only)
    const tokenData = await exchangeCodeForToken(code, redirectUriToUse);
    console.log('[OAuth Callback] Token exchange successful');

    // Fetch Discord user identity
    const discordUser = await fetchDiscordUser(tokenData.access_token);
    console.log('[OAuth Callback] Discord user identity fetched:', discordUser.username);

    // Fetch Discord guild memberships
    const discordGuilds = await fetchDiscordGuilds(tokenData.access_token);
    console.log('[OAuth Callback] User total guilds count:', discordGuilds.length);

    // Filter to only guilds the user can manage
    const manageableDiscordGuilds = filterManageableGuilds(discordGuilds);
    console.log('[OAuth Callback] Manageable guilds count:', manageableDiscordGuilds.length);

    // Cross-reference with DB to determine bot presence
    const manageableGuildIds = manageableDiscordGuilds.map((g) => g.id);
    let botPresentMap = new Map<string, boolean>();

    try {
      const botUrl = getBotApiUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const botRes = await fetch(`${botUrl}/guilds`, {
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeoutId);

      if (botRes && botRes.ok) {
        const botJson = await botRes.json().catch(() => null);
        const rawGuilds = botJson && (Array.isArray(botJson.data) ? botJson.data : Array.isArray(botJson.guilds) ? botJson.guilds : null);
        if (rawGuilds) {
          for (const bg of rawGuilds as { id: string }[]) {
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
        console.log('[OAuth Callback] Querying database for manageable guilds bot status...');
        const dbGuilds = await prisma.guild.findMany({
          where: { id: { in: manageableGuildIds } },
          select: { id: true, botPresent: true },
        });
        for (const dg of dbGuilds) {
          if (!botPresentMap.has(dg.id)) {
            botPresentMap.set(dg.id, dg.botPresent);
          }
        }
        console.log('[OAuth Callback] Database query completed successfully');
      } catch (dbErr) {
        console.warn('[OAuth Callback] Database check warning (non-fatal, continuing with fallback):', dbErr instanceof Error ? dbErr.message : dbErr);
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
    const newSession = await getSessionFromRequest(req, responseForSession);
    newSession.authenticated = true;
    newSession.user = mapDiscordUser(discordUser);
    newSession.guilds = sessionGuilds;
    newSession.oauthState = undefined;
    await newSession.save();

    console.log('[OAuth Callback] Authenticated session created successfully for user:', discordUser.username);

    // Canonical dashboard redirect destination
    const dashboardUrl = new URL('/dashboard', req.url);
    console.log('[OAuth Callback] Success! Redirecting to:', dashboardUrl.toString());

    return NextResponse.redirect(dashboardUrl.toString(), {
      headers: responseForSession.headers,
      status: 302,
    });
  } catch (err) {
    console.error('[OAuth Callback Exception]:', err instanceof Error ? err.message : String(err), err instanceof Error ? err.stack : '');
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
