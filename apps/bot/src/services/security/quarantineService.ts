import { GuildMember } from 'discord.js';
import { HierarchyService } from '../moderation/hierarchyService';
import { QuarantineResult } from './securityTypes';
import { logger } from '../../utils/logger';

export class QuarantineService {
  // In-memory cache of quarantined members' prior roles: Map<"guildId:memberId", roleIds[]>
  private static quarantinedRolesCache = new Map<string, string[]>();

  /**
   * Quarantines a member by assigning the quarantine role and storing their existing roles.
   */
  public static async quarantineMember(
    member: GuildMember,
    botMember: GuildMember,
    quarantineRoleId: string,
    reason: string
  ): Promise<QuarantineResult> {
    const guild = member.guild;
    const quarantineRole = guild.roles.cache.get(quarantineRoleId);

    if (!quarantineRole) {
      return {
        success: false,
        error: `Quarantine role with ID ${quarantineRoleId} not found in guild.`,
      };
    }

    // Validate bot role hierarchy vs quarantine role
    const roleValidation = HierarchyService.canManageRole(botMember, quarantineRole);
    if (!roleValidation.allowed) {
      return {
        success: false,
        error: roleValidation.message || 'Bot cannot assign quarantine role due to role hierarchy.',
      };
    }

    // Validate bot role hierarchy vs target member
    const memberValidation = HierarchyService.canModerateMember(botMember, member, botMember);
    if (!memberValidation.allowed) {
      return {
        success: false,
        error: memberValidation.message || 'Bot cannot moderate target member due to role hierarchy.',
      };
    }

    const cacheKey = `${guild.id}:${member.id}`;
    // Capture existing roles (excluding @everyone and managed integration roles)
    const existingRoles: string[] = [];
    if (member.roles.cache) {
      const rolesIterable = typeof (member.roles.cache as any).values === 'function'
        ? Array.from((member.roles.cache as any).values())
        : [];
      for (const role of rolesIterable as any[]) {
        if (role.id !== guild.id && !role.managed) {
          existingRoles.push(role.id);
        }
      }
    }

    this.quarantinedRolesCache.set(cacheKey, existingRoles);

    try {
      // Add quarantine role
      await member.roles.add(quarantineRole, reason);

      logger.info(
        { guildId: guild.id, memberId: member.id, quarantineRoleId },
        'Member placed into role quarantine successfully'
      );

      return {
        success: true,
        previousRoles: existingRoles,
      };
    } catch (err: any) {
      logger.error(
        { err, guildId: guild.id, memberId: member.id },
        'Failed to add quarantine role to member'
      );
      return {
        success: false,
        error: err?.message || 'Discord API error applying quarantine role.',
      };
    }
  }

  /**
   * Releases a member from quarantine, optionally restoring their previous roles.
   */
  public static async releaseMember(
    member: GuildMember,
    botMember: GuildMember,
    quarantineRoleId: string,
    restoreRoles: boolean = true
  ): Promise<{ success: boolean; error?: string }> {
    const guild = member.guild;
    const quarantineRole = guild.roles.cache.get(quarantineRoleId);

    if (quarantineRole) {
      const roleValidation = HierarchyService.canManageRole(botMember, quarantineRole);
      if (roleValidation.allowed && member.roles.cache.has(quarantineRoleId)) {
        try {
          await member.roles.remove(quarantineRole, 'Released from security quarantine');
        } catch (err: any) {
          logger.warn({ err, memberId: member.id }, 'Failed to remove quarantine role');
        }
      }
    }

    const cacheKey = `${guild.id}:${member.id}`;
    const previousRoles = this.quarantinedRolesCache.get(cacheKey);

    if (restoreRoles && previousRoles && previousRoles.length > 0) {
      try {
        for (const roleId of previousRoles) {
          const role = guild.roles.cache.get(roleId);
          if (role && HierarchyService.canManageRole(botMember, role).allowed) {
            await member.roles.add(role, 'Restoring roles after security quarantine release').catch(() => null);
          }
        }
      } catch (err) {
        logger.warn({ err, memberId: member.id }, 'Failed to restore some previous roles after quarantine');
      }
    }

    this.quarantinedRolesCache.delete(cacheKey);
    return { success: true };
  }

  /**
   * Gets cached previous roles for testing/debugging.
   */
  public static getCachedRoles(guildId: string, memberId: string): string[] | undefined {
    return this.quarantinedRolesCache.get(`${guildId}:${memberId}`);
  }

  /**
   * Resets the cache (useful for testing).
   */
  public static reset(): void {
    this.quarantinedRolesCache.clear();
  }
}
