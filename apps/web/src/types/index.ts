import { ApplicationStatus, StaffPermissionLevel, AuditAction } from '@repo/database';

export interface ApplicationItem {
  id: string;
  guildId: string;
  userId: string;
  userTag: string;
  userAvatar?: string | null;
  roleId: string;
  roleName: string;
  inGameName: string;
  inGameId: string;
  currentRank: string;
  screenshotUrl?: string | null;
  status: ApplicationStatus;
  rejectionReason?: string | null;
  reviewerId?: string | null;
  reviewerTag?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsSummary {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  applicationsToday: number;
  approvalRate: number;
  rejectionRate: number;
  applicationsPerDay: { date: string; count: number }[];
  mostRequestedRoles: { roleName: string; count: number }[];
  mostActiveStaff: { staffTag: string; count: number }[];
}

export interface GuildItem {
  id: string;
  name: string;
  icon?: string | null;
  ownerId: string;
  botJoinedAt: string;
}
