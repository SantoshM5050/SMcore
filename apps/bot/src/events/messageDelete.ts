import { Message, PartialMessage } from 'discord.js';
import { LogCategory } from '@repo/database';
import { LogService } from '../services/logService';
import { logger } from '../logger';

export async function onMessageDelete(message: Message | PartialMessage) {
  try {
    if (!message.guild || message.author?.bot) return;

    await LogService.log({
      guild: message.guild,
      category: LogCategory.MESSAGE,
      eventType: 'MESSAGE_DELETE',
      title: '🗑️ Message Deleted',
      targetId: message.author?.id,
      targetTag: message.author?.tag,
      channelId: message.channelId,
      colorHex: '#EF4444',
      fields: [
        { name: 'Author', value: message.author ? `<@${message.author.id}> (${message.author.tag})` : 'Unknown', inline: true },
        { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
        {
          name: 'Content',
          value: message.content ? `\`\`\`${message.content.slice(0, 950)}\`\`\`` : '*No text content (embed or attachment)*',
          inline: false,
        },
      ],
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error logging message deletion');
  }
}
