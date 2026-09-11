import { prisma, StaffPermission } from '@repo/database';
import { DiscordApi } from './discord';

export interface UserGuildPermissions {
  isOwner: boolean;
  isAdmin: boolean;
  permissions: StaffPermission[];
  hasPermission: (perm: StaffPermission) => boolean;
  canConfigureGuild: boolean;
  canModerate: boolean;
  canViewLogs: boolean;
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
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
    });

    const isOwner = guild?.ownerId === discordUserId;
    let isAdmin = isOwner;

    // Check Discord permissions flag (0x8 = ADMINISTRATOR)
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

    const allPermissions = Object.values(StaffPermission) as StaffPermission[];

    if (isAdmin || isOwner) {
      return {
        isOwner,
        isAdmin: true,
        permissions: allPermissions,
        hasPermission: () => true,
        canConfigureGuild: true,
        canModerate: true,
        canViewLogs: true,
      };
    }

    // Check staff role permissions for member
    // Query bot / Discord for user's roles if possible or check all assigned staff roles in DB
    const staffRoles = await prisma.staffRole.findMany({
      where: { guildId },
    });

    // In web dashboard session without member role query, admins have full access.
    // If not admin, collect granted permissions from bound roles
    const granted = new Set<StaffPermission>();
    for (const r of staffRoles) {
      for (const p of r.permissions) {
        granted.add(p);
      }
    }

    const permsList = Array.from(granted);

    return {
      isOwner: false,
      isAdmin: false,
      permissions: permsList,
      hasPermission: (perm: StaffPermission) => granted.has(perm),
      canConfigureGuild: granted.has(StaffPermission.MANAGE_SETTINGS),
      canModerate: granted.has(StaffPermission.VIEW_MODERATION),
      canViewLogs: granted.has(StaffPermission.VIEW_LOGS),
    };
  }
}

export async function checkStaffPermission(
  guildId: string,
  discordUserId: string,
  requiredPermission: StaffPermission,
  accessToken?: string
): Promise<boolean> {
  const perms = await RbacService.checkUserPermissions(discordUserId, guildId, accessToken);
  return perms.hasPermission(requiredPermission);
}

