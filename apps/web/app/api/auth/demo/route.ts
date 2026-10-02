import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  const nextParam = req.nextUrl.searchParams.get('next') || '/dashboard';
  const redirectUrl = new URL(nextParam, req.url);
  const response = NextResponse.redirect(redirectUrl);

  const session = await getSessionFromRequest(req, response);
  session.authenticated = true;
  session.user = {
    id: '123456789012345678',
    username: 'Commander',
    globalName: 'Server Admin',
    avatar: null,
    discriminator: '0',
  };
  session.guilds = [
    {
      id: '987654321098765432',
      name: 'Apex Gaming Community',
      icon: null,
      owner: true,
      permissions: '8', // ADMINISTRATOR
    },
    {
      id: '876543210987654321',
      name: 'Sentinel Dev Guild',
      icon: null,
      owner: false,
      permissions: '32', // MANAGE_GUILD
    },
  ];

  await session.save();
  return response;
}
