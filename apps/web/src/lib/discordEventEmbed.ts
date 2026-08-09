import { prisma } from '@/lib/prisma';

export async function sendOrUpdateEventDiscordEmbed(eventId: string) {
  const event = await prisma.eventSignup.findUnique({
    where: { id: eventId },
    include: {
      participants: {
        orderBy: { joinedAt: 'asc' },
      },
      guild: true,
    },
  });

  if (!event) {
    throw new Error(`Event ${eventId} not found`);
  }

  const rawToken = process.env.DISCORD_BOT_TOKEN || '';
  const botToken = rawToken.trim().replace(/^["']|["']$/g, '');

  if (!botToken || botToken === 'YOUR_DISCORD_BOT_TOKEN') {
    console.warn(`[Discord Event Embed] DISCORD_BOT_TOKEN missing. Skipping Discord post.`);
    return null;
  }

  const mainTeam = event.participants.filter((p) => p.roleType === 'MAIN_TEAM');
  const substitutes = event.participants.filter((p) => p.roleType === 'SUBSTITUTE');

  const mainTeamList = mainTeam.length > 0
    ? mainTeam.map((p) => `<@${p.userId}>`).join('\n')
    : 'None';

  const substitutesList = substitutes.length > 0
    ? substitutes.map((p) => `<@${p.userId}>`).join('\n')
    : 'None';

  const isClosed = event.status !== 'OPEN';
  const registrationStatusText = !isClosed ? '🟢 Open' : '🔒 Closed';

  const hexColor = (event.embedColor || '#E74C3C').replace('#', '');
  const colorInt = parseInt(hexColor, 16) || 0xe74c3c;

  const guildName = event.guild?.name || 'Hood Rich';

  const embedPayload = {
    title: `📢 ${event.title}`,
    description: event.description || `Register for ${event.title}`,
    color: colorInt,
    fields: [
      {
        name: `🔥 Main Team (${mainTeam.length}/${event.maxMainTeam})`,
        value: mainTeamList,
        inline: false,
      },
      {
        name: '🪑 Substitutes',
        value: substitutesList,
        inline: false,
      },
      {
        name: '📌 Registration',
        value: registrationStatusText,
        inline: false,
      },
    ],
    footer: {
      text: `${guildName} • Signup System`,
    },
  };

  const componentsPayload = [
    {
      type: 1, // ActionRow
      components: [
        {
          type: 2, // Button
          custom_id: `event_signup_join_${event.id}`,
          label: 'Join',
          style: 3, // Success (Green)
          disabled: isClosed,
        },
        {
          type: 2, // Button
          custom_id: `event_signup_leave_${event.id}`,
          label: 'Leave',
          style: 2, // Secondary (Dark/Gray)
          disabled: isClosed,
        },
      ],
    },
  ];

  let targetUrl = `https://discord.com/api/v10/channels/${event.channelId}/messages`;
  let httpMethod = 'POST';

  if (event.messageId) {
    targetUrl = `https://discord.com/api/v10/channels/${event.channelId}/messages/${event.messageId}`;
    httpMethod = 'PATCH';
  }

  let res = await fetch(targetUrl, {
    method: httpMethod,
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      embeds: [embedPayload],
      components: componentsPayload,
    }),
  });

  // If PATCH failed (message deleted), fallback to POST
  if (!res.ok && httpMethod === 'PATCH') {
    res = await fetch(`https://discord.com/api/v10/channels/${event.channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embedPayload],
        components: componentsPayload,
      }),
    });
  }

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[Discord Event Embed] Failed to send embed to channel ${event.channelId}:`, errText);
    throw new Error(`Discord API returned ${res.status}: ${errText}`);
  }

  const msgData = await res.json();

  await prisma.eventSignup.update({
    where: { id: event.id },
    data: { messageId: msgData.id },
  });

  return msgData;
}
