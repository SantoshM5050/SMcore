import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData, SESSION_OPTIONS } from '@/lib/auth/session';

/**
 * Next.js Edge Middleware — Authentication Guard
 *
 * Protects:
 *   /dashboard/*  — redirects unauthenticated users to /login
 *   /api/guilds/* — returns 401 JSON for unauthenticated API calls
 *
 * Public routes (no auth required):
 *   /                  — landing page / login redirect
 *   /login             — login page
 *   /api/auth/*        — OAuth2 flow
 *   /api/health        — health probe (no auth, used by bot)
 *   /_next/*           — Next.js internals
 *   /favicon.ico
 */
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/guilds/:path*',
  ],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Read session from the request
  const res = new NextResponse();
  let authenticated = false;

  try {
    const session = await getIronSession<SessionData>(req, res, SESSION_OPTIONS);
    authenticated = session.authenticated === true && !!session.user;
  } catch {
    // Session decryption failure = treat as unauthenticated
    authenticated = false;
  }

  if (!authenticated) {
    // API route: return 401 JSON
    if (pathname.startsWith('/api/guilds')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Authentication required. Please log in to access this resource.',
          },
        },
        { status: 401 }
      );
    }

    // Dashboard route: redirect to login
    if (pathname.startsWith('/dashboard')) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = '/login';
      // Preserve the intended destination (internal paths only)
      if (pathname !== '/dashboard') {
        loginUrl.searchParams.set('next', pathname);
      }
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}
