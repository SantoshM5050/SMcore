import { AutoModerationActionExecution } from 'discord.js';
import { AuditAction } from '@repo/database';
import { LogService } from '../services/logService';

export async function onAutoModerationActionExecution(actionExecution: AutoModerationActionExecution) {
  try {
    const guildId = actionExecution.guild.id;
    const userId = actionExecution.userId;

    const user = await actionExecution.guild.client.users.fetch(userId).catch(() => null);
    const userTag = user ? user.tag : `User ${userId}`;

    const actionTypeStr = actionExecution.action.type.toString();
    const ruleTrigger = actionExecution.ruleTriggerType?.toString() || 'AutoMod Rule';

    await LogService.logEvent(
      guildId,
      userId,
      userTag,
      AuditAction.AUTOMOD_ALERT,
      {
        rule: ruleTrigger,
        matchedKeyword: actionExecution.matchedKeyword || 'N/A',
        matchedContent: actionExecution.matchedContent ? actionExecution.matchedContent.slice(0, 300) : 'N/A',
        actionTaken: actionTypeStr,
        channel: actionExecution.channel ? `#${actionExecution.channel.name}` : 'Unknown Channel',
        channelId: actionExecution.channelId || 'N/A',
      }
    );
  } catch (err) {
    console.error('[autoModerationActionExecution Event Error]:', err);
  }
}
