import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';

/**
 * POST /api/auth/logout
 *
 * Destroys the session and clears the session cookie.
 * After this call, /dashboard and /api/guilds/* will require re-authentication.
 */
export async function POST(req: NextRequest) {
  const res = new NextResponse();
  const session = await getSessionFromRequest(req, res);

  // Destroy the session (clears all session data and invalidates the cookie)
  session.destroy();
  await session.save();

  return NextResponse.json(
    { success: true, message: 'Logged out successfully' },
    { headers: res.headers }
  );
}
