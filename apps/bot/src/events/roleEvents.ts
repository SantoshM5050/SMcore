import { Role } from 'discord.js';
import { LogCategory } from '@repo/database';
import { LogService } from '../services/logService';
import { logger } from '../logger';

export async function onRoleCreate(role: Role) {
  try {
    await LogService.log({
      guild: role.guild,
      category: LogCategory.ROLE,
      eventType: 'ROLE_CREATE',
      title: '🎭 Role Created',
      colorHex: role.hexColor || '#10B981',
      fields: [
        { name: 'Role', value: `@${role.name} (${role.id})`, inline: true },
        { name: 'Color', value: role.hexColor, inline: true },
      ],
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in onRoleCreate event');
  }
}

export async function onRoleDelete(role: Role) {
  try {
    await LogService.log({
      guild: role.guild,
      category: LogCategory.ROLE,
      eventType: 'ROLE_DELETE',
      title: '🗑️ Role Deleted',
      colorHex: '#EF4444',
      fields: [
        { name: 'Role Name', value: `@${role.name}`, inline: true },
        { name: 'Role ID', value: role.id, inline: true },
      ],
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in onRoleDelete event');
  }
}

export async function onRoleUpdate(oldRole: Role, newRole: Role) {
  try {
    const changes: string[] = [];
    if (oldRole.name !== newRole.name) {
      changes.push(`Name: @${oldRole.name} → @${newRole.name}`);
    }
    if (oldRole.hexColor !== newRole.hexColor) {
      changes.push(`Color: ${oldRole.hexColor} → ${newRole.hexColor}`);
    }
    if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
      changes.push('Permissions updated');
    }

    if (changes.length === 0) return;

    await LogService.log({
      guild: newRole.guild,
      category: LogCategory.ROLE,
      eventType: 'ROLE_UPDATE',
      title: '⚙️ Role Updated',
      colorHex: newRole.hexColor || '#3B82F6',
      fields: [
        { name: 'Role', value: `@${newRole.name} (${newRole.id})`, inline: true },
        { name: 'Changes', value: changes.join('\n'), inline: false },
      ],
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in onRoleUpdate event');
  }
}
