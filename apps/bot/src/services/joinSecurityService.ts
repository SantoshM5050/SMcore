import { GuildMember } from 'discord.js';
import { prisma, JoinSecurityAction, LogCategory } from '@repo/database';
import { ModerationService } from './moderationService';
import { LogService } from './logService';
import { logger } from '../logger';

export class JoinSecurityService {
  public static async inspectMember(member: GuildMember): Promise<void> {
    const guild = member.guild;

    const config = await prisma.joinSecurityConfig.findUnique({
      where: { guildId: guild.id },
    });

    if (!config || !config.enabled) {
      return;
    }

    const accountAgeDays = Math.floor(
      (Date.now() - member.user.createdTimestamp) / (24 * 60 * 60 * 1000)
    );

    let violated = false;
    let reason = '';

    if (accountAgeDays < config.minAccountAgeDays) {
      violated = true;
      reason = `Account age (${accountAgeDays}d) is below the minimum required (${config.minAccountAgeDays}d).`;
    }

    if (config.blockDefaultAvatars && !member.user.avatar) {
      violated = true;
      reason = 'Accounts with default Discord avatars are restricted.';
    }

    if (violated) {
      logger.info({ guild: guild.id, user: member.id, reason }, 'Join security policy enforced');

      if (config.action === JoinSecurityAction.KICK) {
        await ModerationService.kick(guild, null, member, `[Security Gate] ${reason}`);
      } else if (config.action === JoinSecurityAction.TIMEOUT) {
        await ModerationService.timeout(guild, null, member, 1440, `[Security Gate] ${reason}`);
      } else if (config.action === JoinSecurityAction.QUARANTINE && config.quarantineRoleId) {
        await member.roles.add(config.quarantineRoleId, `[Security Gate] ${reason}`).catch(() => null);
      }

      await LogService.log({
        guild,
        category: LogCategory.MEMBER,
        eventType: 'MEMBER_SECURITY_GATE',
        title: '🛡️ Member Security Gate Triggered',
        targetId: member.id,
        targetTag: member.user.tag,
        colorHex: '#F59E0B',
        fields: [
          { name: 'Member', value: `<@${member.id}> (${member.id})`, inline: true },
          { name: 'Account Age', value: `${accountAgeDays} days`, inline: true },
          { name: 'Action Enforced', value: config.action, inline: true },
          { name: 'Reason', value: reason, inline: false },
        ],
      });
    }
  }
}
