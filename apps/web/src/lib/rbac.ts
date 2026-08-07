import { prisma, StaffPermissionLevel } from '@repo/database';
import { DiscordApi } from './discord';

export interface UserGuildPermissions {
  isAdmin: boolean;
  isHighCommand: boolean;
  isManager: boolean;
  canManageApplications: boolean;
  canConfigureGuild: boolean;
}

export class RbacService {
  /**
   * Check permissions for a user in a target guild
   */
  static async checkUserPermissions(
    discordUserId: string,
    guildId: string,
    accessToken?: string
  ): Promise<UserGuildPermissions> {
    // 1. Fetch guild info from DB
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
    });

    const isOwner = guild?.ownerId === discordUserId;
    let isAdmin = isOwner;

    // If OAuth access token provided, check Discord permissions flag (0x8 = ADMINISTRATOR)
    if (accessToken && !isAdmin) {
      try {
        const userGuilds = await DiscordApi.getUserGuilds(accessToken);
        const targetGuild = userGuilds.find((g) => g.id === guildId);
        if (targetGuild) {
          const permissions = BigInt(targetGuild.permissions);
          const ADMINISTRATOR = BigInt(0x8);
          if ((permissions & ADMINISTRATOR) === ADMINISTRATOR || targetGuild.owner) {
            isAdmin = true;
          }
        }
      } catch (err) {
        console.warn('Failed to verify Discord admin permissions via OAuth API:', err);
      }
    }

    if (isAdmin) {
      return {
        isAdmin: true,
        isHighCommand: true,
        isManager: true,
        canManageApplications: true,
        canConfigureGuild: true,
      };
    }

    // 2. Fetch staff permission definitions from DB
    const staffRoles = await prisma.staffPermission.findMany({
      where: { guildId },
    });

    if (staffRoles.length === 0) {
      return {
        isAdmin: false,
        isHighCommand: false,
        isManager: false,
        canManageApplications: false,
        canConfigureGuild: false,
      };
    }

    // Default to false for non-admins if role matching is needed
    // In full production, staff member roles are verified against Discord Guild API member object
    const isHighCommand = false;
    const isManager = false;

    return {
      isAdmin,
      isHighCommand,
      isManager,
      canManageApplications: isAdmin || isHighCommand || isManager,
      canConfigureGuild: isAdmin,
    };
  }
}
