import { GuildMember, PartialGuildMember } from 'discord.js';
import { LogCategory } from '@repo/database';
import { LogService } from '../services/logService';
import { logger } from '../logger';

export async function onGuildMemberUpdate(
  oldMember: GuildMember | PartialGuildMember,
  newMember: GuildMember
) {
  try {
    const guild = newMember.guild;

    // 1. Nickname Change
    if (oldMember.nickname !== newMember.nickname) {
      await LogService.log({
        guild,
        category: LogCategory.MEMBER,
        eventType: 'MEMBER_NICKNAME_CHANGE',
        title: '🏷️ Nickname Changed',
        targetId: newMember.id,
        targetTag: newMember.user.tag,
        colorHex: '#3B82F6',
        fields: [
          { name: 'Member', value: `<@${newMember.id}>`, inline: true },
          { name: 'Old Nickname', value: oldMember.nickname || '*None*', inline: true },
          { name: 'New Nickname', value: newMember.nickname || '*None*', inline: true },
        ],
      });
    }

    // 2. Role Additions / Removals
    const oldRoles = new Set(oldMember.roles.cache.keys());
    const newRoles = new Set(newMember.roles.cache.keys());

    const addedRoles = Array.from(newRoles).filter((r) => !oldRoles.has(r));
    const removedRoles = Array.from(oldRoles).filter((r) => !newRoles.has(r));

    if (addedRoles.length > 0 || removedRoles.length > 0) {
      const roleFields: { name: string; value: string; inline?: boolean }[] = [
        { name: 'Member', value: `<@${newMember.id}> (${newMember.user.tag})`, inline: true },
      ];

      if (addedRoles.length > 0) {
        roleFields.push({
          name: 'Roles Added',
          value: addedRoles.map((r) => `<@&${r}>`).join(', '),
          inline: false,
        });
      }

      if (removedRoles.length > 0) {
        roleFields.push({
          name: 'Roles Removed',
          value: removedRoles.map((r) => `<@&${r}>`).join(', '),
          inline: false,
        });
      }

      await LogService.log({
        guild,
        category: LogCategory.ROLE,
        eventType: 'MEMBER_ROLES_UPDATED',
        title: '🎭 Member Roles Updated',
        targetId: newMember.id,
        targetTag: newMember.user.tag,
        colorHex: '#8B5CF6',
        fields: roleFields,
      });
    }
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in onGuildMemberUpdate event');
  }
}
