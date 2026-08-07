import { prisma } from '@repo/database';
import { botClient } from '../client';

export class RoleService {
  /**
   * Get all active and requestable roles for a guild from DB, sorted by Discord position (lowest to highest)
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
   * Sync Discord Guild roles into DB with Discord position series ordering
   */
  static async syncGuildRoles(guildId: string) {
    try {
      const guild = await botClient.guilds.fetch(guildId).catch(() => null);
      if (!guild) return;

      const discordRoles = await guild.roles.fetch();

      for (const role of discordRoles.values()) {
        if (role.managed || role.name === '@everyone') continue;

        // Save Discord position directly as displayOrder
        const displayOrder = role.position;

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
            displayOrder,
          },
          create: {
            guildId,
            roleId: role.id,
            roleName: role.name,
            roleColor: role.hexColor === '#000000' ? '#99AAB5' : role.hexColor,
            isRequestable: false, // Default to false until enabled in dashboard
            enabled: true,
            displayOrder,
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

  /**
   * Update Member's Nickname in Discord server to "Name | ID"
   */
  static async updateMemberNickname(guildId: string, userId: string, inGameName: string, inGameId: string): Promise<boolean> {
    try {
      const guild = await botClient.guilds.fetch(guildId).catch(() => null);
      if (!guild) return false;

      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) return false;

      let newNickname = `${inGameName} | ${inGameId}`;
      if (newNickname.length > 32) {
        newNickname = newNickname.slice(0, 32); // Discord 32 char nickname limit
      }

      await member.setNickname(newNickname).catch((err) => {
        console.warn(`[Nickname] Could not update nickname for user ${userId}:`, err.message);
      });

      return true;
    } catch (error) {
      console.error(`Failed to set nickname for member ${userId}:`, error);
      return false;
    }
  }
}
