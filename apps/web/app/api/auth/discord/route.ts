import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { buildAuthorizationUrl } from '@/lib/auth/discord';
import { randomBytes } from 'crypto';

/**
 * GET /api/auth/discord
 *
 * Generates a cryptographically secure OAuth2 state, stores it in the
 * session cookie, then redirects to Discord's authorization page.
 *
 * Security:
 * - State is 16 random bytes (128 bits of entropy) encoded as hex
 * - State is single-use: stored in session before redirect, validated on callback
 * - State is short-lived (session cookie TTL applies)
 * - No user-supplied redirect URL is accepted
 */
export async function GET(req: NextRequest) {
  const response = NextResponse.redirect('about:blank'); // placeholder, will be replaced

  try {
    // Generate cryptographically secure state
    const state = randomBytes(16).toString('hex');

    // Store state in session before redirect
    const session = await getSessionFromRequest(req, response);
    session.oauthState = state;
    session.authenticated = false;
    await session.save();

    // Build Discord authorization URL
    const authUrl = buildAuthorizationUrl(state);

    // Return redirect with session cookie set
    return NextResponse.redirect(authUrl, {
      headers: response.headers,
      status: 302,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth configuration error';
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('error', 'oauth_config');
    loginUrl.searchParams.set('message', encodeURIComponent(message));
    return NextResponse.redirect(loginUrl.toString(), { status: 302 });
  }
}
