import { Message, PartialMessage } from 'discord.js';
import { AuditAction } from '@repo/database';
import { LogService } from '../services/logService';

export async function onMessageDelete(message: Message | PartialMessage) {
  try {
    if (!message.guild || message.author?.bot) return;

    const guildId = message.guild.id;
    const userId = message.author ? message.author.id : 'UNKNOWN';
    const userTag = message.author ? message.author.tag : 'Unknown User';

    const attachmentsCount = message.attachments?.size || 0;
    const content = message.content ? message.content.slice(0, 800) : '[No Text Content / Embedded Content]';

    await LogService.logEvent(
      guildId,
      userId,
      userTag,
      AuditAction.MESSAGE_DELETED,
      {
        channel: `#${(message.channel as any)?.name || 'unknown'}`,
        channelId: message.channelId,
        messageId: message.id,
        content: content,
        attachments: attachmentsCount > 0 ? `${attachmentsCount} file(s)` : 'None',
      }
    );
  } catch (err) {
    console.error('[messageDelete Event Error]:', err);
  }
}
