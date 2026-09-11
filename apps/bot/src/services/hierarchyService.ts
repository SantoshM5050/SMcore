import { Guild, GuildMember, User } from 'discord.js';

export interface HierarchyCheckResult {
  allowed: boolean;
  reason?: string;
}

export class HierarchyService {
  /**
   * Validates whether an executor can perform a moderation action on a target member.
   */
  public static canModerate(
    guild: Guild,
    executor: GuildMember | null,
    target: GuildMember | User
  ): HierarchyCheckResult {
    // If target is just a User and not in the guild (e.g. unbanned or left), allow if executor has permissions
    if (!(target instanceof GuildMember)) {
      return { allowed: true };
    }

    // 1. Cannot moderate server owner
    if (target.id === guild.ownerId) {
      return {
        allowed: false,
        reason: 'The server owner cannot be targeted by moderation actions.',
      };
    }

    // 2. Cannot moderate oneself
    if (executor && executor.id === target.id) {
      return {
        allowed: false,
        reason: 'You cannot perform moderation actions against yourself.',
      };
    }

    // 3. Bot cannot moderate someone with equal or higher role than bot's highest role
    const botMember = guild.members.me;
    if (botMember && target.roles.highest.position >= botMember.roles.highest.position) {
      return {
        allowed: false,
        reason: 'The bot lacks hierarchy to moderate this user (their highest role is equal to or higher than the bot).',
      };
    }

    // 4. If executor is not server owner, validate executor's role hierarchy
    if (executor && executor.id !== guild.ownerId) {
      if (target.roles.highest.position >= executor.roles.highest.position) {
        return {
          allowed: false,
          reason: 'You cannot moderate a member who has a role equal to or higher than your highest role.',
        };
      }
    }

    return { allowed: true };
  }
}
