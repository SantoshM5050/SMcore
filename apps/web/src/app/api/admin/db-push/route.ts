import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('[DB Sync API] Running SQL schema migrations...');

    await prisma.$executeRawUnsafe(`ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "accessToken" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "EventSignup" ADD COLUMN IF NOT EXISTS "pingRoleId" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "GuildSettings" ADD COLUMN IF NOT EXISTS "reviewPingRoleId" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "GuildSettings" ADD COLUMN IF NOT EXISTS "commonRoleId" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "ChannelConfiguration" ADD COLUMN IF NOT EXISTS "modLogChannelId" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "ChannelConfiguration" ADD COLUMN IF NOT EXISTS "modPanelChannelId" TEXT;`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "WelcomeConfig" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "guildId" TEXT NOT NULL UNIQUE,
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        "channelId" TEXT,
        "embedTitle" TEXT NOT NULL DEFAULT 'Welcome to the Server!',
        "embedDescription" TEXT NOT NULL DEFAULT 'Hey {user}, welcome to {server}! Enjoy your stay and check out the rules channel.',
        "embedColor" TEXT NOT NULL DEFAULT '#5865F2',
        "bannerUrl" TEXT,
        "autoRoleId" TEXT,
        "goodbyeEnabled" BOOLEAN NOT NULL DEFAULT false,
        "goodbyeChannelId" TEXT,
        "goodbyeMessage" TEXT NOT NULL DEFAULT '{user} has left the server.',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "WelcomeConfig_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "ModerationAction" AS ENUM ('BAN', 'KICK', 'TIMEOUT', 'WARN', 'PURGE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ModerationLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "guildId" TEXT NOT NULL,
        "targetUserId" TEXT NOT NULL,
        "targetUserTag" TEXT NOT NULL,
        "moderatorId" TEXT NOT NULL,
        "moderatorTag" TEXT NOT NULL,
        "action" "ModerationAction" NOT NULL,
        "reason" TEXT,
        "durationMinutes" INTEGER,
        "count" INTEGER,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ModerationLog_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    console.log('[DB Sync API] SQL schema migration completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Production Database schema successfully updated via SQL migration!',
    });
  } catch (err: any) {
    console.error('[DB Sync API Error]:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || String(err),
      },
      { status: 500 }
    );
  }
}
