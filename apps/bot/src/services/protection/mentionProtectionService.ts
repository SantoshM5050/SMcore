import { GuildProtectionSettings, ProtectionType } from '@smcore/shared';
import { DetectionResult } from './protectionTypes';

export interface MentionData {
  userCount: number;
  roleCount: number;
  hasEveryone: boolean;
  hasHere: boolean;
}

export class MentionProtectionService {
  /**
   * Evaluates if mentions in a message violate the mass mention protection policy
   */
  public static checkMentions(
    mentions: MentionData,
    settings: GuildProtectionSettings
  ): DetectionResult {
    if (!settings.massMentionEnabled) {
      return { violated: false };
    }

    // 1. Check unauthorized @everyone or @here
    if (!settings.everyoneMentionAllowed && (mentions.hasEveryone || mentions.hasHere)) {
      return {
        violated: true,
        protectionType: ProtectionType.MASS_MENTION,
        reason: 'Unauthorized @everyone or @here mention detected',
        punishment: settings.massMentionPunishment,
        deleteMessage: settings.deleteViolatingMessages,
        metadata: {
          hasEveryone: mentions.hasEveryone,
          hasHere: mentions.hasHere,
        },
      };
    }

    // 2. Check user mentions count
    if (mentions.userCount > settings.maxUserMentions) {
      return {
        violated: true,
        protectionType: ProtectionType.MASS_MENTION,
        reason: `Exceeded user mention limit (${mentions.userCount}/${settings.maxUserMentions})`,
        punishment: settings.massMentionPunishment,
        deleteMessage: settings.deleteViolatingMessages,
        metadata: {
          userCount: mentions.userCount,
          limit: settings.maxUserMentions,
        },
      };
    }

    // 3. Check role mentions count
    if (mentions.roleCount > settings.maxRoleMentions) {
      return {
        violated: true,
        protectionType: ProtectionType.MASS_MENTION,
        reason: `Exceeded role mention limit (${mentions.roleCount}/${settings.maxRoleMentions})`,
        punishment: settings.massMentionPunishment,
        deleteMessage: settings.deleteViolatingMessages,
        metadata: {
          roleCount: mentions.roleCount,
          limit: settings.maxRoleMentions,
        },
      };
    }

    // 4. Check total mentions count
    const totalMentions = mentions.userCount + mentions.roleCount;
    if (totalMentions > settings.maxTotalMentions) {
      return {
        violated: true,
        protectionType: ProtectionType.MASS_MENTION,
        reason: `Exceeded total mention limit (${totalMentions}/${settings.maxTotalMentions})`,
        punishment: settings.massMentionPunishment,
        deleteMessage: settings.deleteViolatingMessages,
        metadata: {
          totalMentions,
          limit: settings.maxTotalMentions,
        },
      };
    }

    return { violated: false };
  }
}
