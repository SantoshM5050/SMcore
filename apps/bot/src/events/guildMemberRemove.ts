import { GuildMember, PartialGuildMember } from 'discord.js';
import { LogCategory } from '@repo/database';
import { LogService } from '../services/logService';
import { logger } from '../logger';

export async function onGuildMemberRemove(member: GuildMember | PartialGuildMember) {
  try {
    const guild = member.guild;
    const userTag = member.user?.tag || member.user?.username || 'Unknown Member';
    const userId = member.user?.id || member.id;

    await LogService.log({
      guild,
      category: LogCategory.MEMBER,
      eventType: 'MEMBER_LEAVE',
      title: '📤 Member Left',
      targetId: userId,
      targetTag: userTag,
      colorHex: '#EF4444',
      fields: [
        { name: 'Member', value: `<@${userId}> (${userTag})`, inline: true },
        { name: 'Remaining Members', value: `${guild.memberCount}`, inline: true },
      ],
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in guildMemberRemove event handler');
  }
}
