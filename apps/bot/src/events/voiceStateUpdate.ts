import { VoiceState } from 'discord.js';
import { LogCategory } from '@repo/database';
import { LogService } from '../services/logService';
import { logger } from '../logger';

export async function onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
  try {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;

    const guild = newState.guild;

    // 1. Joined Voice Channel
    if (!oldState.channelId && newState.channelId) {
      await LogService.log({
        guild,
        category: LogCategory.VOICE,
        eventType: 'VOICE_JOIN',
        title: '🔊 Voice Channel Joined',
        targetId: member.id,
        targetTag: member.user.tag,
        channelId: newState.channelId,
        colorHex: '#10B981',
        fields: [
          { name: 'Member', value: `<@${member.id}> (${member.user.tag})`, inline: true },
          { name: 'Channel', value: `<#${newState.channelId}>`, inline: true },
        ],
      });
    }
    // 2. Left Voice Channel
    else if (oldState.channelId && !newState.channelId) {
      await LogService.log({
        guild,
        category: LogCategory.VOICE,
        eventType: 'VOICE_LEAVE',
        title: '🔇 Voice Channel Left',
        targetId: member.id,
        targetTag: member.user.tag,
        channelId: oldState.channelId,
        colorHex: '#EF4444',
        fields: [
          { name: 'Member', value: `<@${member.id}> (${member.user.tag})`, inline: true },
          { name: 'Channel', value: `<#${oldState.channelId}>`, inline: true },
        ],
      });
    }
    // 3. Moved Voice Channels
    else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      await LogService.log({
        guild,
        category: LogCategory.VOICE,
        eventType: 'VOICE_MOVE',
        title: '🔀 Voice Channel Switched',
        targetId: member.id,
        targetTag: member.user.tag,
        colorHex: '#3B82F6',
        fields: [
          { name: 'Member', value: `<@${member.id}> (${member.user.tag})`, inline: true },
          { name: 'From', value: `<#${oldState.channelId}>`, inline: true },
          { name: 'To', value: `<#${newState.channelId}>`, inline: true },
        ],
      });
    }
    // 4. Server Mute / Deafen Toggled
    else if (oldState.serverMute !== newState.serverMute || oldState.serverDeaf !== newState.serverDeaf) {
      const stateChanges: string[] = [];
      if (oldState.serverMute !== newState.serverMute) {
        stateChanges.push(`Server Mute: ${newState.serverMute ? 'MUTED' : 'UNMUTED'}`);
      }
      if (oldState.serverDeaf !== newState.serverDeaf) {
        stateChanges.push(`Server Deafen: ${newState.serverDeaf ? 'DEAFENED' : 'UNDEAFENED'}`);
      }

      await LogService.log({
        guild,
        category: LogCategory.VOICE,
        eventType: 'VOICE_MODERATION',
        title: '🎙️ Voice Moderation State Changed',
        targetId: member.id,
        targetTag: member.user.tag,
        channelId: newState.channelId || undefined,
        colorHex: '#F59E0B',
        fields: [
          { name: 'Member', value: `<@${member.id}> (${member.user.tag})`, inline: true },
          { name: 'Changes', value: stateChanges.join(' • '), inline: false },
        ],
      });
    }
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in voiceStateUpdate event handler');
  }
}
