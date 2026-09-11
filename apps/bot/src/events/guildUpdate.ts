import { Guild } from 'discord.js';
import { LogCategory } from '@repo/database';
import { LogService } from '../services/logService';
import { logger } from '../logger';

export async function onGuildUpdate(oldGuild: Guild, newGuild: Guild) {
  try {
    const changes: string[] = [];

    if (oldGuild.name !== newGuild.name) {
      changes.push(`Server Name: **${oldGuild.name}** → **${newGuild.name}**`);
    }
    if (oldGuild.icon !== newGuild.icon) {
      changes.push('Server Icon has been changed');
    }
    if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
      changes.push(`Verification Level: ${oldGuild.verificationLevel} → ${newGuild.verificationLevel}`);
    }

    if (changes.length === 0) return;

    await LogService.log({
      guild: newGuild,
      category: LogCategory.SERVER,
      eventType: 'SERVER_UPDATE',
      title: '⚙️ Server Settings Updated',
      colorHex: '#6366F1',
      fields: [{ name: 'Modifications', value: changes.join('\n'), inline: false }],
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in onGuildUpdate event');
  }
}
