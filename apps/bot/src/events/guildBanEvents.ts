import { GuildBan } from 'discord.js';
import { LogCategory } from '@repo/database';
import { LogService } from '../services/logService';
import { logger } from '../logger';

export async function onGuildBanAdd(ban: GuildBan) {
  try {
    await LogService.log({
      guild: ban.guild,
      category: LogCategory.MODERATION,
      eventType: 'GUILD_BAN_ADD',
      title: '🔨 Ban Added',
      targetId: ban.user.id,
      targetTag: ban.user.tag,
      colorHex: '#EF4444',
      fields: [
        { name: 'User', value: `<@${ban.user.id}> (${ban.user.tag})`, inline: true },
        { name: 'Reason', value: ban.reason || 'No reason provided', inline: false },
      ],
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in guildBanAdd event handler');
  }
}

export async function onGuildBanRemove(ban: GuildBan) {
  try {
    await LogService.log({
      guild: ban.guild,
      category: LogCategory.MODERATION,
      eventType: 'GUILD_BAN_REMOVE',
      title: '🔓 Ban Removed',
      targetId: ban.user.id,
      targetTag: ban.user.tag,
      colorHex: '#10B981',
      fields: [
        { name: 'User', value: `<@${ban.user.id}> (${ban.user.tag})`, inline: true },
      ],
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in guildBanRemove event handler');
  }
}
