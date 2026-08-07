import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { DiscordApi, DiscordUser } from './discord';

const SESSION_COOKIE_NAME = 'discord_role_session';

export interface SessionData {
  user: {
    id: string;
    discordId: string;
    username: string;
    discriminator: string;
    avatar: string | null;
    email: string | null;
  };
  sessionToken: string;
}

export class AuthService {
  /**
   * Exchange Discord OAuth2 Code for Access Token
   */
  static async exchangeCode(code: string, redirectUri: string) {
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID || '',
      client_secret: process.env.DISCORD_CLIENT_SECRET || '',
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    const res = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Discord OAuth token exchange failed: ${errorText}`);
    }

    return res.json();
  }

  /**
   * Handle user login & create session
   */
  static async loginWithDiscordToken(accessToken: string): Promise<SessionData> {
    const profile: DiscordUser = await DiscordApi.getUserProfile(accessToken);

    // Upsert User record
    const user = await prisma.user.upsert({
      where: { discordId: profile.id },
      update: {
        username: profile.username,
        discriminator: profile.discriminator,
        avatar: profile.avatar,
        email: profile.email || null,
      },
      create: {
        discordId: profile.id,
        username: profile.username,
        discriminator: profile.discriminator,
        avatar: profile.avatar,
        email: profile.email || null,
      },
    });

    // Create session (expires in 7 days)
    const sessionToken = crypto.randomUUID();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires,
      },
    });

    return { user, sessionToken };
  }

  /**
   * Retrieve session user from request cookie
   */
  static async getSessionUser(): Promise<SessionData['user'] | null> {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      include: { user: true },
    });

    if (!session || session.expires < new Date()) {
      return null;
    }

    return session.user;
  }

  static getSessionCookieName() {
    return SESSION_COOKIE_NAME;
  }
}
