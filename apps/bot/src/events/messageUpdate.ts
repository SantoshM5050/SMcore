import { Message, PartialMessage } from 'discord.js';
import { AuditAction } from '@repo/database';
import { LogService } from '../services/logService';

export async function onMessageUpdate(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) {
  try {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return; // Ignores embed loading updates

    const guildId = newMessage.guild.id;
    const userId = newMessage.author ? newMessage.author.id : 'UNKNOWN';
    const userTag = newMessage.author ? newMessage.author.tag : 'Unknown User';
    const avatarUrl = newMessage.author?.displayAvatarURL({ forceStatic: false });

    const beforeContent = oldMessage.content ? oldMessage.content.slice(0, 500) : '[Empty / Unknown]';
    const afterContent = newMessage.content ? newMessage.content.slice(0, 500) : '[Empty]';

    await LogService.logEvent(
      guildId,
      userId,
      userTag,
      AuditAction.MESSAGE_EDITED,
      {
        channelId: newMessage.channelId,
        before: beforeContent,
        after: afterContent,
        messageLink: `https://discord.com/channels/${guildId}/${newMessage.channelId}/${newMessage.id}`,
        userAvatar: avatarUrl,
      }
    );
  } catch (err) {
    console.error('[messageUpdate Event Error]:', err);
  }
}
