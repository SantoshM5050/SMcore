import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth';
import { ApplicationStatus } from '@repo/database';

export async function GET(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;
  const { searchParams } = new URL(request.url);

  const status = searchParams.get('status') as ApplicationStatus | null;
  const roleId = searchParams.get('roleId');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const sort = searchParams.get('sort') || 'desc';

  const where: any = { guildId };

  if (status && Object.values(ApplicationStatus).includes(status)) {
    where.status = status;
  }

  if (roleId) {
    where.roleId = roleId;
  }

  if (search) {
    where.OR = [
      { userTag: { contains: search, mode: 'insensitive' } },
      { inGameName: { contains: search, mode: 'insensitive' } },
      { inGameId: { contains: search, mode: 'insensitive' } },
      { currentRank: { contains: search, mode: 'insensitive' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.application.findMany({
      where,
      orderBy: { createdAt: sort === 'asc' ? 'asc' : 'desc' },
      skip,
      take: limit,
      include: {
        history: { orderBy: { createdAt: 'desc' } },
      },
    }),
    prisma.application.count({ where }),
  ]);

  return NextResponse.json({
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}
