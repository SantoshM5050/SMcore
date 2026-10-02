import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@smcore/database';
import { authorizeGuildAccess } from '@/lib/auth/authorize';

interface RouteContext {
  params: { guildId: string };
}

export interface MemberRecord {
  id: string;
  username: string;
  globalName: string;
  discriminator: string;
  avatar: string | null;
  roles: Array<{ id: string; name: string; color: string }>;
  joinedAt: string;
  accountCreatedAt: string;
  accountAgeDays: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'ACTIVE' | 'TIMED_OUT' | 'QUARANTINED' | 'WARNED';
  warningsCount: number;
  casesCount: number;
}

const SEED_MEMBERS: MemberRecord[] = [
  {
    id: '123456789012345678',
    username: 'Commander',
    globalName: 'Server Administrator',
    discriminator: '0',
    avatar: null,
    roles: [
      { id: 'r1', name: 'Administrator', color: '#6366f1' },
      { id: 'r2', name: 'Security Lead', color: '#10b981' },
    ],
    joinedAt: new Date(Date.now() - 86400000 * 120).toISOString(),
    accountCreatedAt: new Date(Date.now() - 86400000 * 800).toISOString(),
    accountAgeDays: 800,
    riskLevel: 'LOW',
    status: 'ACTIVE',
    warningsCount: 0,
    casesCount: 0,
  },
  {
    id: '200100100100100102',
    username: 'SpammyGamer',
    globalName: 'SpammyGamer99',
    discriminator: '9999',
    avatar: null,
    roles: [{ id: 'r3', name: 'Verified Member', color: '#94a3b8' }],
    joinedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    accountCreatedAt: new Date(Date.now() - 86400000 * 25).toISOString(),
    accountAgeDays: 25,
    riskLevel: 'MEDIUM',
    status: 'WARNED',
    warningsCount: 2,
    casesCount: 1,
  },
  {
    id: '200100100100100103',
    username: 'ChaoticUser',
    globalName: 'Chaotic',
    discriminator: '4321',
    avatar: null,
    roles: [{ id: 'r3', name: 'Verified Member', color: '#94a3b8' }],
    joinedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    accountCreatedAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    accountAgeDays: 12,
    riskLevel: 'MEDIUM',
    status: 'TIMED_OUT',
    warningsCount: 1,
    casesCount: 2,
  },
  {
    id: '200100100100100104',
    username: 'FreshAccount_99',
    globalName: 'NitroPromoBot',
    discriminator: '0',
    avatar: null,
    roles: [{ id: 'r4', name: 'Quarantined', color: '#f43f5e' }],
    joinedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    accountCreatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    accountAgeDays: 2,
    riskLevel: 'HIGH',
    status: 'QUARANTINED',
    warningsCount: 0,
    casesCount: 1,
  },
  {
    id: '200100100100100105',
    username: 'ValkyrieMod',
    globalName: 'Valkyrie',
    discriminator: '1337',
    avatar: null,
    roles: [{ id: 'r5', name: 'Moderator', color: '#38bdf8' }],
    joinedAt: new Date(Date.now() - 86400000 * 90).toISOString(),
    accountCreatedAt: new Date(Date.now() - 86400000 * 500).toISOString(),
    accountAgeDays: 500,
    riskLevel: 'LOW',
    status: 'ACTIVE',
    warningsCount: 0,
    casesCount: 0,
  },
  {
    id: '200100100100100106',
    username: 'SilentSpectator',
    globalName: 'Observer',
    discriminator: '0',
    avatar: null,
    roles: [{ id: 'r3', name: 'Verified Member', color: '#94a3b8' }],
    joinedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    accountCreatedAt: new Date(Date.now() - 86400000 * 150).toISOString(),
    accountAgeDays: 150,
    riskLevel: 'LOW',
    status: 'ACTIVE',
    warningsCount: 0,
    casesCount: 0,
  },
];

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { guildId } = params;

  const authResult = await authorizeGuildAccess(req, guildId);
  if (!authResult.authorized) {
    return authResult.response;
  }

  const { searchParams } = req.nextUrl;
  const search = searchParams.get('search')?.toLowerCase() || '';
  const roleFilter = searchParams.get('role') || 'ALL';
  const riskFilter = searchParams.get('risk') || 'ALL';
  const statusFilter = searchParams.get('status') || 'ALL';

  let filtered = [...SEED_MEMBERS];

  if (search) {
    filtered = filtered.filter(
      (m) =>
        m.username.toLowerCase().includes(search) ||
        m.globalName.toLowerCase().includes(search) ||
        m.id.includes(search)
    );
  }

  if (roleFilter !== 'ALL') {
    filtered = filtered.filter((m) => m.roles.some((r) => r.name.toLowerCase() === roleFilter.toLowerCase()));
  }

  if (riskFilter !== 'ALL') {
    filtered = filtered.filter((m) => m.riskLevel === riskFilter);
  }

  if (statusFilter !== 'ALL') {
    filtered = filtered.filter((m) => m.status === statusFilter);
  }

  return NextResponse.json({
    success: true,
    data: {
      total: filtered.length,
      members: filtered,
    },
  });
}
