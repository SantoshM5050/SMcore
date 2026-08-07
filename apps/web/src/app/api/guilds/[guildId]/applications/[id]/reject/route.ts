import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth';
import { ApplicationStatus, AuditAction } from '@repo/database';
import { logDashboardAudit } from '@/lib/auditLogger';
import { z } from 'zod';

const rejectSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required').max(500),
});

export async function POST(
  request: Request,
  { params }: { params: { guildId: string; id: string } }
) {
  const user = await AuthService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { guildId, id } = params;

  const body = await request.json().catch(() => ({}));
  const validation = rejectSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
  }

  const application = await prisma.application.findUnique({
    where: { id },
  });

  if (!application || application.guildId !== guildId) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  if (application.status !== ApplicationStatus.PENDING) {
    return NextResponse.json({ error: 'Application has already been resolved' }, { status: 400 });
  }

  const updated = await prisma.application.update({
    where: { id },
    data: {
      status: ApplicationStatus.REJECTED,
      rejectionReason: validation.data.reason,
      reviewerId: user.discordId,
      reviewerTag: `${user.username}#${user.discriminator}`,
    },
  });

  await prisma.applicationHistory.create({
    data: {
      applicationId: id,
      actorId: user.discordId,
      actorTag: `${user.username}#${user.discriminator}`,
      previousStatus: ApplicationStatus.PENDING,
      newStatus: ApplicationStatus.REJECTED,
      reason: validation.data.reason,
    },
  });

  await logDashboardAudit(
    guildId,
    user.discordId,
    `${user.username}#${user.discriminator}`,
    AuditAction.APPLICATION_REJECTED,
    {
      applicationId: id,
      roleName: application.roleName,
      applicantTag: application.userTag,
      reason: validation.data.reason,
      source: 'web_dashboard',
    }
  );

  return NextResponse.json(updated);
}
