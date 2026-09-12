import { GuildMember, Role } from 'discord.js';
import { HierarchyCheckResult } from '@smcore/shared';

export interface HierarchyValidation {
  allowed: boolean;
  code: HierarchyCheckResult;
  message?: string;
}

export class HierarchyService {
  /**
   * Validates whether a moderator can perform a moderation action on a target member
   */
  public static canModerateMember(
    moderator: GuildMember,
    target: GuildMember,
    bot: GuildMember
  ): HierarchyValidation {
    // 1. Target is self
    if (moderator.id === target.id) {
      return {
        allowed: false,
        code: HierarchyCheckResult.TARGET_IS_SELF,
        message: 'You cannot perform moderation actions against yourself.',
      };
    }

    // 2. Target is the bot itself
    if (target.id === bot.id) {
      return {
        allowed: false,
        code: HierarchyCheckResult.TARGET_IS_BOT,
        message: 'You cannot perform moderation actions against SMCore bot.',
      };
    }

    // 3. Target is the Guild Owner
    if (target.id === target.guild.ownerId) {
      return {
        allowed: false,
        code: HierarchyCheckResult.TARGET_IS_GUILD_OWNER,
        message: 'The guild owner cannot be targeted by moderation actions.',
      };
    }

    // 4. Moderator is Guild Owner -> Bypass role hierarchy check against members
    const isModeratorOwner = moderator.id === moderator.guild.ownerId;

    if (!isModeratorOwner) {
      // Target's highest role is >= moderator's highest role
      if (target.roles.highest.position >= moderator.roles.highest.position) {
        return {
          allowed: false,
          code: HierarchyCheckResult.TARGET_ROLE_TOO_HIGH,
          message:
            'You cannot moderate this user because their highest role is equal to or higher than yours.',
        };
      }
    }

    // 5. Bot hierarchy check: Target's highest role >= bot's highest role
    if (target.roles.highest.position >= bot.roles.highest.position) {
      return {
        allowed: false,
        code: HierarchyCheckResult.BOT_ROLE_TOO_LOW,
        message:
          'SMCore cannot moderate this member because their highest role is equal to or higher than the bot role.',
      };
    }

    return {
      allowed: true,
      code: HierarchyCheckResult.SUCCESS,
    };
  }

  /**
   * Validates whether the bot can assign or manage a specific role
   */
  public static canManageRole(bot: GuildMember, role: Role): HierarchyValidation {
    if (role.id === role.guild.id) {
      return {
        allowed: false,
        code: HierarchyCheckResult.TARGET_ROLE_TOO_HIGH,
        message: 'Cannot modify the @everyone role.',
      };
    }

    if (role.position >= bot.roles.highest.position) {
      return {
        allowed: false,
        code: HierarchyCheckResult.BOT_ROLE_TOO_LOW,
        message:
          'SMCore cannot manage this role because it is positioned higher than or equal to the bot role.',
      };
    }

    return {
      allowed: true,
      code: HierarchyCheckResult.SUCCESS,
    };
  }
}
