import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@smcore/database';
import { authorizeGuildAccess } from '@/lib/auth/authorize';

interface RouteContext {
  params: { guildId: string };
}

let sentEmbedsStore: Record<string, any[]> = {};

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { guildId } = params;

  const authResult = await authorizeGuildAccess(req, guildId);
  if (!authResult.authorized) {
    return authResult.response;
  }

  const list = sentEmbedsStore[guildId] || [
    {
      id: 'emb-1',
      title: '🛡️ Server Rules & Community Guidelines',
      description: 'Welcome to the server! Please review our conduct policy to keep the community safe.',
      color: '#6366f1',
      channelId: '100100100100100101',
      channelName: '#rules-and-info',
      author: 'Server Staff Team',
      fields: [
        { name: 'Rule 1', value: 'Be respectful in all text and voice channels.' },
        { name: 'Rule 2', value: 'No unsolicited Discord invite links or commercial promotions.' },
        { name: 'Rule 3', value: 'Listen to directives given by moderation staff.' },
      ],
      sentAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'emb-2',
      title: '🚨 Anti-Raid Surge Protection Activated',
      description: 'Automatic lockdown engaged due to abnormal join surge activity. Verify in #onboarding.',
      color: '#f43f5e',
      channelId: '100100100100100102',
      channelName: '#announcements',
      author: 'SMCore Sentinel',
      fields: [
        { name: 'Gate Status', value: 'Quarantine Gate Active' },
        { name: 'New Accounts', value: 'Auto-isolation (< 7 days old)' },
      ],
      sentAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
  ];

  return NextResponse.json({
    success: true,
    data: list,
  });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { guildId } = params;

  const authResult = await authorizeGuildAccess(req, guildId);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const payload = await req.json();
    const newEmbed = {
      id: `emb-${Date.now()}`,
      title: payload.title || 'Announcement',
      description: payload.description || '',
      color: payload.color || '#6366f1',
      channelId: payload.channelId || '100100100100100101',
      channelName: payload.channelName || '#announcements',
      author: payload.author || authResult.userId,
      fields: payload.fields || [],
      footer: payload.footer || 'SMCore Dispatcher',
      sentAt: new Date().toISOString(),
    };

    if (!sentEmbedsStore[guildId]) {
      sentEmbedsStore[guildId] = [];
    }
    sentEmbedsStore[guildId].unshift(newEmbed);

    // Create an audit log record
    await prisma.auditLog.create({
      data: {
        guildId,
        eventType: 'CONFIG',
        action: 'EMBED_DISPATCH',
        actorUserId: authResult.userId,
        targetType: 'CHANNEL',
        channelId: payload.channelId,
        reason: `Dispatched embed '${payload.title}' to ${payload.channelName || '#announcements'}`,
        metadata: { embedId: newEmbed.id, title: newEmbed.title },
      },
    });

    return NextResponse.json({
      success: true,
      data: newEmbed,
      message: 'Embed message successfully dispatched to Discord channel.',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: 'Failed to dispatch embed' } },
      { status: 500 }
    );
  }
}
