import { Message } from 'discord.js';
import { AutoModService } from '../services/autoModService';
import { logger } from '../logger';

export async function onMessageCreate(message: Message) {
  try {
    if (!message.guild || message.author.bot) return;
    await AutoModService.processMessage(message);
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in messageCreate AutoMod pipeline');
  }
}
