import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';

/**
 * GET /api/auth/me
 *
 * Returns the authenticated user's identity from session.
 * Never returns access tokens, refresh tokens, or secrets.
 *
 * Authenticated response (200):
 * { authenticated: true, user: { id, username, globalName, avatar } }
 *
 * Unauthenticated response (401):
 * { authenticated: false }
 */
export async function GET(req: NextRequest) {
  const res = new NextResponse();
  const session = await getSessionFromRequest(req, res);

  if (!session.authenticated || !session.user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // Return only the safe identity fields — never tokens
  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.user.id,
      username: session.user.username,
      globalName: session.user.globalName,
      avatar: session.user.avatar,
      discriminator: session.user.discriminator,
    },
    guilds: session.guilds ?? [],
  });
}
