import { Collection } from 'discord.js';
import { moderationCommands, CommandHandler } from './moderationCommands';

export const commandList = [...moderationCommands];

export const commands = new Collection<string, CommandHandler>();

for (const cmd of commandList) {
  commands.set(cmd.data.name, cmd);
}

export * from './moderationCommands';
