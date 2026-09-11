import {
  ModerationAction,
  AutoModType,
  AutoModAction,
  LogCategory,
  LogDestinationType,
  ForumThreadMode,
  StaffPermission,
  AuditAction,
} from '@repo/database';

export interface GuildItem {
  id: string;
  name: string;
  icon?: string | null;
  ownerId: string;
  botJoinedAt: string;
}

export interface AnalyticsSummary {
  totalCases: number;
  totalBans: number;
  totalTimeouts: number;
  totalKicks: number;
  totalWarnings: number;
  autoModBlocks: number;
  raidEvents: number;
  raidModeActive: boolean;
  actionsToday: number;
  activityToday?: number;
  actionsPerDay: { date: string; count: number }[];
  recentCases: ModerationCaseItem[];
  recentActivity?: { type: string; title: string; subtitle: string; timestamp?: string }[];
}

export interface ModerationOverviewStats extends AnalyticsSummary {}


export interface ModerationCaseItem {
  id: string;
  caseNumber: number;
  guildId: string;
  targetId: string;
  targetTag: string;
  targetAvatar?: string | null;
  moderatorId: string;
  moderatorTag: string;
  action: ModerationAction;
  reason?: string | null;
  durationMinutes?: number | null;
  metadata?: any;
  createdAt: string;
}

export interface WarningItem {
  id: string;
  warningNumber: number;
  guildId: string;
  userId: string;
  userTag: string;
  moderatorId: string;
  moderatorTag: string;
  reason: string;
  isActive: boolean;
  caseId?: string | null;
  createdAt: string;
}

export interface MemberNoteItem {
  id: string;
  guildId: string;
  userId: string;
  authorId: string;
  authorTag: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface LogConfigItem {
  id?: string;
  category: LogCategory;
  enabled: boolean;
  destinationType: LogDestinationType;
  channelId?: string | null;
  forumThreadMode: ForumThreadMode;
  showIds: boolean;
  showModerator: boolean;
  showReason: boolean;
  showChannel: boolean;
  showTimestamp: boolean;
  showBeforeAfter: boolean;
  mentionUsers: boolean;
  embedColor?: string;
}

export interface StaffRoleItem {
  id: string;
  guildId: string;
  roleId: string;
  roleName: string;
  roleColor: string;
  permissions: StaffPermission[];
  createdAt: string;
}
