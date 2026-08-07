import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth';

export async function GET() {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const guilds = await prisma.guild.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(guilds);
}
