import { Client, GatewayIntentBits, Partials } from 'discord.js';

export function createBotClient() {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
  });
}

export let botClient = createBotClient();

export function resetBotClient() {
  try {
    botClient.destroy();
  } catch (e) {
    // Ignore destroy errors
  }
  botClient = createBotClient();
  return botClient;
}

