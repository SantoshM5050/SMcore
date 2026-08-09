import { Client, GatewayIntentBits, Partials } from 'discord.js';

export function createBotClient(minimal = false) {
  const intents = minimal
    ? [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
      ]
    : [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ];

  return new Client({
    intents,
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
  });
}

export let botClient = createBotClient();

export function resetBotClient(minimal = false) {
  if (botClient && botClient.isReady()) {
    return botClient;
  }
  try {
    botClient.destroy();
  } catch (e) {
    // Ignore destroy errors
  }
  botClient = createBotClient(minimal);
  return botClient;
}


