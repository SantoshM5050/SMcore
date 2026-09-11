import { botClient } from '../client';
import { logger } from '../logger';

export class RoleService {
  /**
   * Assign a Discord role to a guild member
   */
  static async assignRoleToMember(guildId: string, userId: string, roleId: string): Promise<boolean> {
    try {
      const guild = await botClient.guilds.fetch(guildId).catch(() => null);
      if (!guild) return false;

      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) return false;

      const role = await guild.roles.fetch(roleId).catch(() => null);
      if (!role) return false;

      await member.roles.add(role);
      return true;
    } catch (error: any) {
      logger.error({ err: error.message, guildId, userId, roleId }, 'Failed to assign role to member');
      return false;
    }
  }

  /**
   * Remove a Discord role from a guild member
   */
  static async removeRoleFromMember(guildId: string, userId: string, roleId: string): Promise<boolean> {
    try {
      const guild = await botClient.guilds.fetch(guildId).catch(() => null);
      if (!guild) return false;

      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) return false;

      const role = await guild.roles.fetch(roleId).catch(() => null);
      if (!role) return false;

      await member.roles.remove(role);
      return true;
    } catch (error: any) {
      logger.error({ err: error.message, guildId, userId, roleId }, 'Failed to remove role from member');
      return false;
    }
  }

  /**
   * Moderate or update Member's Nickname in Discord server
   */
  static async updateMemberNickname(guildId: string, userId: string, newNickname: string): Promise<boolean> {
    try {
      const guild = await botClient.guilds.fetch(guildId).catch(() => null);
      if (!guild) return false;

      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) return false;

      const cleanNick = newNickname.slice(0, 32); // Discord 32 char limit
      await member.setNickname(cleanNick).catch((err) => {
        logger.warn({ err: err.message }, 'Could not update nickname for user');
      });

      return true;
    } catch (error: any) {
      logger.error({ err: error.message }, 'Failed to set nickname for member');
      return false;
    }
  }
}
