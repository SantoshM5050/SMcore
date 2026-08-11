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

    // 1. Joined Voice Channel
    if (!oldState.channelId && newState.channelId) {
      await LogService.logEvent(
        guildId,
        userId,
        userTag,
        AuditAction.VOICE_JOINED,
        {
          channel: `#${newState.channel?.name}`,
          channelId: newState.channelId,
          selfMute: newState.selfMute,
          selfDeaf: newState.selfDeaf,
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
          channel: `#${oldState.channel?.name}`,
          channelId: oldState.channelId,
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
          fromChannel: `#${oldState.channel?.name}`,
          toChannel: `#${newState.channel?.name}`,
          fromChannelId: oldState.channelId,
          toChannelId: newState.channelId,
        }
      );
    }
  } catch (err) {
    console.error('[voiceStateUpdate Event Error]:', err);
  }
}
