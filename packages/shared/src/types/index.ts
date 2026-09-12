/**
 * SMCore Global Types
 */

import { StaffPermission } from '../enums';

export interface GuildSummary {
  id: string;
  name: string;
  icon: string | null;
  ownerId: string;
  memberCount: number;
  botPresent: boolean;
  joinedAt: string;
}

export interface UserSession {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string | null;
  guilds: {
    id: string;
    name: string;
    icon: string | null;
    owner: boolean;
    permissions: string;
    hasAdmin: boolean;
  }[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
