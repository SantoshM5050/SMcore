import { GuildMember, EmbedBuilder, TextChannel } from 'discord.js';
import { prisma } from '@repo/database';

export async function onGuildMemberAdd(member: GuildMember) {
  try {
    const guildId = member.guild.id;

    // Fetch WelcomeConfig from DB
    const welcomeConfig = await prisma.welcomeConfig.findUnique({
      where: { guildId },
    });

    if (!welcomeConfig || !welcomeConfig.enabled) return;

    // 1. Auto-Assign Role if configured
    if (welcomeConfig.autoRoleId) {
      try {
        const role = member.guild.roles.cache.get(welcomeConfig.autoRoleId);
        if (role) {
          await member.roles.add(role);
          console.log(`[Auto-Role] Assigned role @${role.name} to ${member.user.tag} in ${member.guild.name}`);
        }
      } catch (roleErr: any) {
        console.warn(`[Auto-Role Error] Could not assign role ${welcomeConfig.autoRoleId}:`, roleErr.message);
      }
    }

    // 2. Post Welcome Embed if channel is configured
    if (welcomeConfig.channelId) {
      const channel = member.guild.channels.cache.get(welcomeConfig.channelId) as TextChannel;
      if (channel && channel.isTextBased()) {
        const title = welcomeConfig.embedTitle || 'Welcome to the Server!';
        const description = (welcomeConfig.embedDescription || 'Hey {user}, welcome to {server}!')
          .replace(/\{user\}/g, `<@${member.user.id}>`)
          .replace(/\{server\}/g, member.guild.name);

        const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(description)
          .setColor((welcomeConfig.embedColor || '#5865F2') as any)
          .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }))
          .setTimestamp();

        if (welcomeConfig.bannerUrl) {
          embed.setImage(welcomeConfig.bannerUrl);
        }

        await channel.send({
          content: `Welcome <@${member.user.id}>!`,
          embeds: [embed],
        });
      }
    }
  } catch (err: any) {
    console.error('[GuildMemberAdd Event Error]:', err);
  }
}
