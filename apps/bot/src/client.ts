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
    rest: {
      userAgentAppendix: 'SMCoreBot/1.0.0 (https://smcore.onrender.com)',
      timeout: 30000,
      retries: 5,
    },
  });
}

export const botSession = {
  client: createBotClient(),
};

export function getBotClient() {
  return botSession.client;
}

export function resetBotClient(minimal = false) {
  if (botSession.client && botSession.client.isReady()) {
    return botSession.client;
  }
  try {
    botSession.client.destroy();
  } catch (e) {
    // Ignore destroy errors
  }
  botSession.client = createBotClient(minimal);
  return botSession.client;
}

// Proxy wrapper so any module importing `botClient` automatically references active botSession.client
export const botClient: Client = new Proxy({} as Client, {
  get(_target, prop) {
    const active = botSession.client;
    const value = Reflect.get(active, prop, active);
    if (typeof value === 'function') {
      return value.bind(active);
    }
    return value;
  },
  set(_target, prop, value) {
    const active = botSession.client;
    return Reflect.set(active, prop, value, active);
  },
});



