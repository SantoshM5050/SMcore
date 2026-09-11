import { GuildMember, PermissionFlagsBits } from 'discord.js';
import { prisma, StaffPermission } from '@repo/database';

export class RbacService {
  /**
   * Checks if a guild member holds a specific staff permission.
   * Server owner and Discord Administrators always possess all permissions.
   */
  public static async hasPermission(
    member: GuildMember,
    permission: StaffPermission
  ): Promise<boolean> {
    // Server owner always has all permissions
    if (member.id === member.guild.ownerId) {
      return true;
    }

    // Discord Administrator permission grants all capabilities
    if (member.permissions.has(PermissionFlagsBits.Administrator)) {
      return true;
    }

    // Check custom StaffRole bindings in database
    const memberRoleIds = Array.from(member.roles.cache.keys());
    if (memberRoleIds.length === 0) {
      return false;
    }

    const staffRoles = await prisma.staffRole.findMany({
      where: {
        guildId: member.guild.id,
        roleId: { in: memberRoleIds },
      },
      select: {
        permissions: true,
      },
    });

    for (const role of staffRoles) {
      if (role.permissions.includes(permission)) {
        return true;
      }
    }

    return false;
  }
}
