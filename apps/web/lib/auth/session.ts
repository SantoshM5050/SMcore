import { getIronSession, IronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// ------------------------------------------------------------
// Discord user shape stored in session
// ------------------------------------------------------------
export interface SessionUser {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  discriminator: string;
}

// Guild membership with permissions as stored in session
export interface SessionGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string; // Discord permission bitfield as string
}

// Full session data shape
export interface SessionData {
  user?: SessionUser;
  guilds?: SessionGuild[];
  oauthState?: string; // short-lived, cleared after callback
  authenticated: boolean;
}

// ------------------------------------------------------------
// Iron-session configuration
// ------------------------------------------------------------
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    return 'smcore-default-session-secret-32-chars-min-key!';
  }
  return secret;
}

export const SESSION_OPTIONS: SessionOptions = {
  cookieName: 'smcore_session',
  password: getSessionSecret(),
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  },
};

// ------------------------------------------------------------
// Session helpers for Server Components / Route Handlers
// ------------------------------------------------------------

/**
 * Get the current session (read/write) in a Server Component or Route Handler.
 * Uses Next.js cookies() which is available in the App Router.
 */
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = cookies();
  return getIronSession<SessionData>(cookieStore, SESSION_OPTIONS);
}

/**
 * Get the current session from a NextRequest (for Route Handlers / Middleware).
 */
export async function getSessionFromRequest(
  req: NextRequest,
  res: NextResponse
): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(req, res, SESSION_OPTIONS);
}

/**
 * Returns the session if authenticated, otherwise returns null.
 * Used in API routes to check auth without throwing.
 */
export async function getAuthenticatedSession(): Promise<IronSession<SessionData> | null> {
  const session = await getSession();
  if (!session.authenticated || !session.user) {
    return null;
  }
  return session;
}

/**
 * Gets session and throws/redirects if not authenticated.
 * Used in Server Components (dashboard layout).
 */
export async function requireSession(): Promise<IronSession<SessionData>> {
  const session = await getSession();
  if (!session.authenticated || !session.user) {
    // Import redirect lazily to avoid issues in non-Next contexts
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }
  return session;
}

/**
 * Utility: get avatar URL for a Discord user from the session.
 */
export function getAvatarUrl(user: SessionUser): string | null {
  if (!user.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=128`;
}

/**
 * Utility: get default Discord avatar URL (based on user ID or discriminator).
 */
export function getDefaultAvatarUrl(user: SessionUser): string {
  const index = user.discriminator === '0'
    ? Number(BigInt(user.id) >> BigInt(22)) % 6
    : Number(user.discriminator) % 5;
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}
