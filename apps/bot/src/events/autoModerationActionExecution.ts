import { AutoModerationActionExecution } from 'discord.js';
import { AuditAction } from '@repo/database';
import { LogService } from '../services/logService';

export async function onAutoModerationActionExecution(actionExecution: AutoModerationActionExecution) {
  try {
    const guildId = actionExecution.guild.id;
    const userId = actionExecution.userId;

    const user = await actionExecution.guild.client.users.fetch(userId).catch(() => null);
    const userTag = user ? user.tag : `User ${userId}`;
    const avatarUrl = user ? user.displayAvatarURL({ forceStatic: false }) : undefined;

    const actionTypeStr = actionExecution.action.type.toString();
    const ruleTrigger = actionExecution.ruleTriggerType?.toString() || 'AutoMod Security Rule';

    await LogService.logEvent(
      guildId,
      userId,
      userTag,
      AuditAction.AUTOMOD_ALERT,
      {
        channelId: actionExecution.channelId || undefined,
        rule: ruleTrigger,
        matchedKeyword: actionExecution.matchedKeyword || undefined,
        content: actionExecution.matchedContent ? actionExecution.matchedContent.slice(0, 400) : undefined,
        actionTaken: actionTypeStr,
        userAvatar: avatarUrl,
      }
    );
  } catch (err) {
    console.error('[autoModerationActionExecution Event Error]:', err);
  }
}
