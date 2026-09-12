import { ProtectionType, AutoModPunishment } from '@smcore/shared';

export interface DetectionResult {
  violated: boolean;
  protectionType?: ProtectionType;
  reason?: string;
  punishment?: AutoModPunishment;
  deleteMessage?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ProtectionEvent {
  guildId: string;
  targetUserId: string;
  protectionType: ProtectionType;
  reason: string;
  channelId: string;
  messageId?: string;
  detectedAt: Date;
  punishment: AutoModPunishment;
  metadata?: Record<string, unknown>;
}
