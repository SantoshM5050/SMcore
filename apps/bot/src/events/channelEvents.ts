import { GuildChannel, DMChannel } from 'discord.js';
import { LogCategory } from '@repo/database';
import { LogService } from '../services/logService';
import { logger } from '../logger';

export async function onChannelCreate(channel: GuildChannel | DMChannel) {
  try {
    if (!('guild' in channel) || !channel.guild) return;

    await LogService.log({
      guild: channel.guild,
      category: LogCategory.CHANNEL,
      eventType: 'CHANNEL_CREATE',
      title: '#️⃣ Channel Created',
      channelId: channel.id,
      colorHex: '#10B981',
      fields: [
        { name: 'Channel', value: `<#${channel.id}> (${channel.name})`, inline: true },
        { name: 'Type', value: `${channel.type}`, inline: true },
      ],
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in onChannelCreate event');
  }
}

export async function onChannelDelete(channel: GuildChannel | DMChannel) {
  try {
    if (!('guild' in channel) || !channel.guild) return;

    await LogService.log({
      guild: channel.guild,
      category: LogCategory.CHANNEL,
      eventType: 'CHANNEL_DELETE',
      title: '🗑️ Channel Deleted',
      channelId: channel.id,
      colorHex: '#EF4444',
      fields: [
        { name: 'Channel Name', value: `#${channel.name}`, inline: true },
        { name: 'Channel ID', value: channel.id, inline: true },
      ],
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in onChannelDelete event');
  }
}

export async function onChannelUpdate(
  oldChannel: GuildChannel | DMChannel,
  newChannel: GuildChannel | DMChannel
) {
  try {
    if (!('guild' in newChannel) || !newChannel.guild) return;
    if (!('name' in oldChannel) || !('name' in newChannel)) return;

    const changes: string[] = [];
    if (oldChannel.name !== newChannel.name) {
      changes.push(`Name: #${oldChannel.name} → #${newChannel.name}`);
    }

    if (changes.length === 0) return;

    await LogService.log({
      guild: newChannel.guild,
      category: LogCategory.CHANNEL,
      eventType: 'CHANNEL_UPDATE',
      title: '⚙️ Channel Updated',
      channelId: newChannel.id,
      colorHex: '#3B82F6',
      fields: [
        { name: 'Channel', value: `<#${newChannel.id}>`, inline: true },
        { name: 'Modifications', value: changes.join('\n'), inline: false },
      ],
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in onChannelUpdate event');
  }
}
