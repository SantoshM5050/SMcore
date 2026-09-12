import { Collection } from 'discord.js';
import { moderationCommands, CommandHandler } from './moderationCommands';
import { ticketCommand } from './ticketCommands';

export const commandList = [...moderationCommands, ticketCommand];

export const commands = new Collection<string, CommandHandler>();

for (const cmd of commandList) {
  commands.set(cmd.data.name, cmd);
}

export * from './moderationCommands';
export * from './ticketCommands';
