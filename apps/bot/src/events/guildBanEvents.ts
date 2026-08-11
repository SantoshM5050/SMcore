import { GuildBan } from 'discord.js';
import { AuditAction } from '@repo/database';
import { LogService } from '../services/logService';

export async function onGuildBanAdd(ban: GuildBan) {
  try {
    const guildId = ban.guild.id;
    const userId = ban.user.id;
    const userTag = ban.user.tag;

    await LogService.logEvent(
      guildId,
      userId,
      userTag,
      AuditAction.MEMBER_BANNED,
      {
        reason: ban.reason || 'No reason provided',
        userAvatar: ban.user.displayAvatarURL(),
      }
    );
  } catch (err) {
    console.error('[guildBanAdd Event Error]:', err);
  }
}

export async function onGuildBanRemove(ban: GuildBan) {
  try {
    const guildId = ban.guild.id;
    const userId = ban.user.id;
    const userTag = ban.user.tag;

    await LogService.logEvent(
      guildId,
      userId,
      userTag,
      AuditAction.MEMBER_UNBANNED,
      {
        userAvatar: ban.user.displayAvatarURL(),
      }
    );
  } catch (err) {
    console.error('[guildBanRemove Event Error]:', err);
  }
}
