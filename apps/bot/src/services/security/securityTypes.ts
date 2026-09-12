import { SecurityAction, SecurityEventType, SecurityRiskLevel } from '@smcore/shared';

export interface JoinContext {
  guildId: string;
  memberId: string;
  accountCreatedAt: Date;
  joinedAt: Date;
  isBot: boolean;
}

export interface AccountRiskResult {
  riskLevel: SecurityRiskLevel;
  accountAgeHours: number;
  isSuspicious: boolean;
  reason?: string;
}

export interface RaidModeState {
  active: boolean;
  triggeredAt?: Date;
  expiresAt?: Date;
  reason?: string;
  currentJoinCount: number;
  threshold: number;
  windowSeconds: number;
}

export interface SecurityEvent {
  guildId: string;
  targetUserId: string;
  type: SecurityEventType;
  riskLevel: SecurityRiskLevel;
  action: SecurityAction;
  reason: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface QuarantineResult {
  success: boolean;
  previousRoles?: string[];
  error?: string;
}
