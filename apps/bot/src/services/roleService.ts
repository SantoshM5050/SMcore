import { prisma } from '@repo/database';
import { botClient } from '../client';

export class RoleService {
  /**
   * Get all active and requestable roles for a guild from DB
   */
  static async getRequestableRoles(guildId: string) {
    return prisma.roleConfiguration.findMany({
      where: {
        guildId,
        isRequestable: true,
        enabled: true,
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });
  }

  /**
   * Sync Discord Guild roles into DB
   */
  static async syncGuildRoles(guildId: string) {
    try {
      const guild = await botClient.guilds.fetch(guildId).catch(() => null);
      if (!guild) return;

      const discordRoles = await guild.roles.fetch();

      for (const role of discordRoles.values()) {
        if (role.managed || role.name === '@everyone') continue;

        await prisma.roleConfiguration.upsert({
          where: {
            guildId_roleId: {
              guildId,
              roleId: role.id,
            },
          },
          update: {
            roleName: role.name,
            roleColor: role.hexColor === '#000000' ? '#99AAB5' : role.hexColor,
          },
          create: {
            guildId,
            roleId: role.id,
            roleName: role.name,
            roleColor: role.hexColor === '#000000' ? '#99AAB5' : role.hexColor,
            isRequestable: false, // Default to false until enabled in dashboard
            enabled: true,
          },
        });
      }
    } catch (error) {
      console.error(`Failed to sync roles for guild ${guildId}:`, error);
    }
  }

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
    } catch (error) {
      console.error(`Failed to assign role ${roleId} to member ${userId}:`, error);
      return false;
    }
  }
}
