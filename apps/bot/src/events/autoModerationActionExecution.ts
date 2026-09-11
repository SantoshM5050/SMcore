import { AutoModerationActionExecution } from 'discord.js';
import { LogCategory } from '@repo/database';
import { LogService } from '../services/logService';
import { logger } from '../logger';

export async function onAutoModerationActionExecution(actionExecution: AutoModerationActionExecution) {
  try {
    const user = await actionExecution.guild.client.users.fetch(actionExecution.userId).catch(() => null);
    const userTag = user ? user.tag : `User ${actionExecution.userId}`;

    await LogService.log({
      guild: actionExecution.guild,
      category: LogCategory.MODERATION,
      eventType: 'DISCORD_AUTOMOD_ACTION',
      title: '🛡️ Discord Native AutoMod Enforced',
      targetId: actionExecution.userId,
      targetTag: userTag,
      channelId: actionExecution.channelId || undefined,
      colorHex: '#F97316',
      fields: [
        { name: 'Target', value: `<@${actionExecution.userId}> (${userTag})`, inline: true },
        { name: 'Channel', value: actionExecution.channelId ? `<#${actionExecution.channelId}>` : 'None', inline: true },
        { name: 'Matched Keyword', value: actionExecution.matchedKeyword || 'None', inline: true },
        {
          name: 'Matched Content',
          value: actionExecution.matchedContent ? `\`\`\`${actionExecution.matchedContent.slice(0, 400)}\`\`\`` : 'N/A',
          inline: false,
        },
      ],
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in autoModerationActionExecution event handler');
  }
}
