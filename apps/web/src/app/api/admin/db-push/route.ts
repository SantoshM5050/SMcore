import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('[DB Sync API] Running SQL schema migrations...');

    await prisma.$executeRawUnsafe(`ALTER TABLE "EventSignup" ADD COLUMN IF NOT EXISTS "pingRoleId" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "GuildSettings" ADD COLUMN IF NOT EXISTS "reviewPingRoleId" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "GuildSettings" ADD COLUMN IF NOT EXISTS "commonRoleId" TEXT;`);

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
