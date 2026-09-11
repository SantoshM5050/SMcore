import { GuildMember } from 'discord.js';
import { LogCategory } from '@repo/database';
import { AntiRaidService } from '../services/antiRaidService';
import { JoinSecurityService } from '../services/joinSecurityService';
import { LogService } from '../services/logService';
import { logger } from '../logger';

export async function onGuildMemberAdd(member: GuildMember) {
  try {
    const guild = member.guild;

    // 1. Anti-Raid Join Frequency Spike Detection
    const raidDetected = await AntiRaidService.handleMemberJoin(member);
    if (raidDetected) {
      logger.warn({ guildId: guild.id, userId: member.id }, 'Join handled during raid spike');
    }

    // 2. Member Join Security Gate (Account Age, Default Avatar)
    await JoinSecurityService.inspectMember(member);

    // 3. Log Member Join
    const accountAgeDays = Math.floor(
      (Date.now() - member.user.createdTimestamp) / (24 * 60 * 60 * 1000)
    );

    await LogService.log({
      guild,
      category: LogCategory.MEMBER,
      eventType: 'MEMBER_JOIN',
      title: '📥 Member Joined',
      targetId: member.id,
      targetTag: member.user.tag,
      colorHex: '#10B981',
      fields: [
        { name: 'Member', value: `<@${member.id}> (${member.user.tag})`, inline: true },
        { name: 'Account Age', value: `${accountAgeDays} days old`, inline: true },
        { name: 'Server Member Count', value: `${guild.memberCount}`, inline: true },
        {
          name: 'Account Created',
          value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
          inline: true,
        },
      ],
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in guildMemberAdd event handler');
  }
}
