import { Message, PartialMessage } from 'discord.js';
import { AuditAction } from '@repo/database';
import { LogService } from '../services/logService';

export async function onMessageDelete(message: Message | PartialMessage) {
  try {
    if (!message.guild || message.author?.bot) return;

    const guildId = message.guild.id;
    const userId = message.author ? message.author.id : 'UNKNOWN';
    const userTag = message.author ? message.author.tag : 'Unknown User';
    const avatarUrl = message.author?.displayAvatarURL({ forceStatic: false });

    const attachmentsCount = message.attachments?.size || 0;
    const content = message.content ? message.content.slice(0, 1000) : '[No Text Content / Attachment Only]';

    await LogService.logEvent(
      guildId,
      userId,
      userTag,
      AuditAction.MESSAGE_DELETED,
      {
        channelId: message.channelId,
        content: content,
        attachments: attachmentsCount > 0 ? `${attachmentsCount} attachment(s)` : undefined,
        userAvatar: avatarUrl,
      }
    );
  } catch (err) {
    console.error('[messageDelete Event Error]:', err);
  }
}
