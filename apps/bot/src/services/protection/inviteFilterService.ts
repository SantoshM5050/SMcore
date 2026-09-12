import { GuildProtectionSettings, ProtectionType } from '@smcore/shared';
import { DetectionResult } from './protectionTypes';

export class InviteFilterService {
  // Regex to match discord invite links
  private static readonly INVITE_REGEX =
    /(?:https?:\/\/)?(?:www\.)?(?:discord(?:\.gg|(?:app)?\.com\/invite)\/([a-zA-Z0-9_-]+))/gi;

  /**
   * Extracts all Discord invite codes found in the message text
   */
  public static extractInviteCodes(content: string): string[] {
    const codes: string[] = [];
    const matches = content.matchAll(this.INVITE_REGEX);
    for (const match of matches) {
      if (match[1]) {
        codes.push(match[1].toLowerCase());
      }
    }
    return codes;
  }

  /**
   * Evaluates if a message contains unauthorized Discord invite links
   */
  public static checkInvites(
    content: string,
    settings: GuildProtectionSettings
  ): DetectionResult {
    if (!settings.inviteFilterEnabled) {
      return { violated: false };
    }

    const inviteCodes = this.extractInviteCodes(content);
    if (inviteCodes.length === 0) {
      return { violated: false };
    }

    // Check if any invite code is NOT in the allowlist
    const allowedCodes = new Set(
      settings.allowedInviteGuilds.map((c) => c.trim().toLowerCase())
    );

    const unauthorizedInvites = inviteCodes.filter((code) => !allowedCodes.has(code));

    if (unauthorizedInvites.length > 0) {
      return {
        violated: true,
        protectionType: ProtectionType.DISCORD_INVITE,
        reason: `Posted unauthorized Discord invite link (${unauthorizedInvites.join(', ')})`,
        punishment: settings.inviteFilterPunishment,
        deleteMessage: settings.deleteViolatingMessages,
        metadata: {
          detectedInvites: unauthorizedInvites,
        },
      };
    }

    return { violated: false };
  }
}
