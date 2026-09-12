import { GuildMember, PermissionsBitField, PermissionResolvable } from 'discord.js';
import { ModerationAction } from '@smcore/shared';

export interface PermissionCheckResult {
  hasPermission: boolean;
  missingPermission?: string;
}

export class PermissionService {
  /**
   * Maps ModerationAction to required Discord Permissions
   */
  public static getRequiredPermission(action: ModerationAction): PermissionResolvable {
    switch (action) {
      case ModerationAction.BAN:
      case ModerationAction.UNBAN:
      case ModerationAction.SOFTBAN:
        return PermissionsBitField.Flags.BanMembers;

      case ModerationAction.KICK:
        return PermissionsBitField.Flags.KickMembers;

      case ModerationAction.TIMEOUT:
      case ModerationAction.UNTIMEOUT:
      case ModerationAction.WARN:
        return PermissionsBitField.Flags.ModerateMembers;

      case ModerationAction.PURGE:
        return PermissionsBitField.Flags.ManageMessages;

      case ModerationAction.LOCK:
      case ModerationAction.UNLOCK:
      case ModerationAction.SLOWMODE:
        return PermissionsBitField.Flags.ManageChannels;

      case ModerationAction.NICKNAME:
        return PermissionsBitField.Flags.ManageNicknames;

      default:
        return PermissionsBitField.Flags.ModerateMembers;
    }
  }

  /**
   * Validates if a moderator has permission for the specified action
   */
  public static canExecuteAction(
    moderator: GuildMember,
    action: ModerationAction
  ): PermissionCheckResult {
    // Guild owner and Administrator bypass all checks
    if (
      moderator.id === moderator.guild.ownerId ||
      moderator.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return { hasPermission: true };
    }

    const requiredPermission = this.getRequiredPermission(action);

    if (!moderator.permissions.has(requiredPermission)) {
      return {
        hasPermission: false,
        missingPermission: requiredPermission.toString(),
      };
    }

    return { hasPermission: true };
  }
}
