import { Client, Events, GuildMember } from 'discord.js';
import { JoinSecurityService } from '../services/security/joinSecurityService';
import { logger } from '../utils/logger';

export function registerGuildMemberAddEvent(client: Client): void {
  client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
    try {
      await JoinSecurityService.processMemberJoin(member);
    } catch (err) {
      logger.error(
        { err, memberId: member.id, guildId: member.guild.id },
        'Unhandled error in guildMemberAdd security pipeline'
      );
    }
  });
}
