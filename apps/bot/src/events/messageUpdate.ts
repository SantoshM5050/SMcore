import { Message, PartialMessage } from 'discord.js';
import { LogCategory } from '@repo/database';
import { LogService } from '../services/logService';
import { logger } from '../logger';

export async function onMessageUpdate(
  oldMessage: Message | PartialMessage,
  newMessage: Message | PartialMessage
) {
  try {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return; // Ignore embed preview updates

    await LogService.log({
      guild: newMessage.guild,
      category: LogCategory.MESSAGE,
      eventType: 'MESSAGE_EDIT',
      title: '✏️ Message Edited',
      targetId: newMessage.author?.id,
      targetTag: newMessage.author?.tag,
      channelId: newMessage.channelId,
      colorHex: '#3B82F6',
      fields: [
        {
          name: 'Author',
          value: newMessage.author ? `<@${newMessage.author.id}> (${newMessage.author.tag})` : 'Unknown',
          inline: true,
        },
        { name: 'Channel', value: `<#${newMessage.channelId}>`, inline: true },
        {
          name: 'Before',
          value: oldMessage.content ? `\`\`\`${oldMessage.content.slice(0, 450)}\`\`\`` : '*Content unavailable*',
          inline: false,
        },
        {
          name: 'After',
          value: newMessage.content ? `\`\`\`${newMessage.content.slice(0, 450)}\`\`\`` : '*Empty*',
          inline: false,
        },
      ],
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in messageUpdate event handler');
  }
}
