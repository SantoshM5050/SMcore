import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth';
import { ApplicationStatus } from '@repo/database';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { guildId: string } }) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId } = params;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [totalPending, totalApproved, totalRejected, applicationsToday, allApps] = await Promise.all([
    prisma.application.count({ where: { guildId, status: ApplicationStatus.PENDING } }),
    prisma.application.count({ where: { guildId, status: ApplicationStatus.APPROVED } }),
    prisma.application.count({ where: { guildId, status: ApplicationStatus.REJECTED } }),
    prisma.application.count({ where: { guildId, createdAt: { gte: startOfToday } } }),
    prisma.application.findMany({
      where: { guildId },
      select: {
        createdAt: true,
        roleName: true,
        reviewerTag: true,
        status: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const totalProcessed = totalApproved + totalRejected;
  const approvalRate = totalProcessed > 0 ? Math.round((totalApproved / totalProcessed) * 100) : 0;
  const rejectionRate = totalProcessed > 0 ? Math.round((totalRejected / totalProcessed) * 100) : 0;

  // Applications per day (last 14 days)
  const daysMap = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    daysMap.set(dateStr, 0);
  }

  allApps.forEach((app) => {
    const dateStr = new Date(app.createdAt).toISOString().split('T')[0];
    if (daysMap.has(dateStr)) {
      daysMap.set(dateStr, (daysMap.get(dateStr) || 0) + 1);
    }
  });

  const applicationsPerDay = Array.from(daysMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  // Most requested roles
  const roleCountMap: Record<string, number> = {};
  allApps.forEach((app) => {
    roleCountMap[app.roleName] = (roleCountMap[app.roleName] || 0) + 1;
  });

  const mostRequestedRoles = Object.entries(roleCountMap)
    .map(([roleName, count]) => ({ roleName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Most active staff
  const staffCountMap: Record<string, number> = {};
  allApps.forEach((app) => {
    if (app.reviewerTag) {
      staffCountMap[app.reviewerTag] = (staffCountMap[app.reviewerTag] || 0) + 1;
    }
  });

  const mostActiveStaff = Object.entries(staffCountMap)
    .map(([staffTag, count]) => ({ staffTag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return NextResponse.json({
    totalPending,
    totalApproved,
    totalRejected,
    applicationsToday,
    approvalRate,
    rejectionRate,
    applicationsPerDay,
    mostRequestedRoles,
    mostActiveStaff,
  });
}
