import { TicketStatus } from '@smcore/shared';

export interface GuildTicketSettingsDTO {
  id: string;
  guildId: string;
  enabled: boolean;
  ticketCategoryChannelId: string | null;
  ticketLogChannelId: string | null;
  transcriptChannelId: string | null;
  supportRoleIds: string[];
  maxOpenTicketsPerUser: number;
  cooldownSeconds: number;
  autoCloseEnabled: boolean;
  autoCloseHours: number;
  allowUserClose: boolean;
  allowReopen: boolean;
  deleteAfterClose: boolean;
  transcriptEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketCategoryDTO {
  id: string;
  guildId: string;
  name: string;
  description: string | null;
  emoji: string | null;
  supportRoleId: string | null;
  categoryChannelId: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketDTO {
  id: string;
  guildId: string;
  channelId: string;
  ticketNumber: number;
  categoryId: string | null;
  creatorUserId: string;
  claimedByUserId: string | null;
  status: TicketStatus;
  subject: string | null;
  closedByUserId: string | null;
  closedAt: Date | null;
  lastActivityAt: Date;
  participants: string[];
  transcriptUrl: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTicketOptions {
  categoryId?: string;
  subject?: string;
  initialMessage?: string;
}

export interface CloseTicketOptions {
  reason?: string;
  generateTranscript?: boolean;
}

export interface TicketMessageEntry {
  id: string;
  authorId: string;
  authorTag: string;
  isBot: boolean;
  content: string;
  attachments: string[];
  timestamp: string;
}

export interface TranscriptResult {
  ticketId: string;
  ticketNumber: number;
  guildId: string;
  messageCount: number;
  generatedAt: string;
  content: string;
  entries: TicketMessageEntry[];
}
