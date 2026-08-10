import { GuildMember, PartialGuildMember, TextChannel } from 'discord.js';
import { prisma } from '@repo/database';

export async function onGuildMemberRemove(member: GuildMember | PartialGuildMember) {
  try {
    const guildId = member.guild.id;

    const welcomeConfig = await prisma.welcomeConfig.findUnique({
      where: { guildId },
    });

    if (!welcomeConfig || !welcomeConfig.goodbyeEnabled) return;

    const targetChannelId = welcomeConfig.goodbyeChannelId || welcomeConfig.channelId;
    if (!targetChannelId) return;

    const channel = member.guild.channels.cache.get(targetChannelId) as TextChannel;
    if (channel && channel.isTextBased()) {
      const userTag = member.user?.tag || member.user?.username || 'A member';
      const msg = (welcomeConfig.goodbyeMessage || '{user} has left the server.')
        .replace(/\{user\}/g, `**${userTag}**`)
        .replace(/\{server\}/g, member.guild.name);

      await channel.send({ content: msg });
    }
  } catch (err: any) {
    console.error('[GuildMemberRemove Event Error]:', err);
  }
}
