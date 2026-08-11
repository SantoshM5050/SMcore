import { VoiceState } from 'discord.js';
import { AuditAction } from '@repo/database';
import { LogService } from '../services/logService';

export async function onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
  try {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;

    const guildId = newState.guild.id;
    const userId = member.user.id;
    const userTag = member.user.tag;
    const avatarUrl = member.user.displayAvatarURL({ forceStatic: false });

    // 1. Joined Voice Channel
    if (!oldState.channelId && newState.channelId) {
      await LogService.logEvent(
        guildId,
        userId,
        userTag,
        AuditAction.VOICE_JOINED,
        {
          channelId: newState.channelId,
          userAvatar: avatarUrl,
        }
      );
    }
    // 2. Left Voice Channel
    else if (oldState.channelId && !newState.channelId) {
      await LogService.logEvent(
        guildId,
        userId,
        userTag,
        AuditAction.VOICE_LEFT,
        {
          channelId: oldState.channelId,
          userAvatar: avatarUrl,
        }
      );
    }
    // 3. Moved Voice Channels
    else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      await LogService.logEvent(
        guildId,
        userId,
        userTag,
        AuditAction.VOICE_MOVED,
        {
          fromChannelId: oldState.channelId,
          toChannelId: newState.channelId,
          userAvatar: avatarUrl,
        }
      );
    }
  } catch (err) {
    console.error('[voiceStateUpdate Event Error]:', err);
  }
}
