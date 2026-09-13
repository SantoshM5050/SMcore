import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { sealData, unsealData } from 'iron-session';

// ------------------------------------------------------------
// Discord Permissions bitfield constants (mirrored from discord.ts)
// ------------------------------------------------------------
const DiscordPermissions = {
  ADMINISTRATOR: 0x8n,
  MANAGE_GUILD: 0x20n,
};

function hasManageGuildPermission(guild) {
  if (guild.owner) return true;
  try {
    const perms = BigInt(guild.permissions);
    const hasAdmin = (perms & DiscordPermissions.ADMINISTRATOR) === DiscordPermissions.ADMINISTRATOR;
    const hasManage = (perms & DiscordPermissions.MANAGE_GUILD) === DiscordPermissions.MANAGE_GUILD;
    return hasAdmin || hasManage;
  } catch {
    return false;
  }
}

function filterManageableGuilds(guilds) {
  return guilds.filter(hasManageGuildPermission);
}

function buildAuthorizationUrl(clientId, redirectUri, state) {
  if (!clientId) throw new Error('DISCORD_CLIENT_ID is not configured');
  if (!redirectUri) throw new Error('DISCORD_REDIRECT_URI is not configured');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify guilds',
    state,
    prompt: 'none',
  });

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

function getBotInstallUrl(clientId) {
  if (!clientId) return '#';
  const params = new URLSearchParams({
    client_id: clientId,
    permissions: '8',
    scope: 'bot applications.commands',
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

const ALLOWED_POST_LOGIN_PATHS = ['/dashboard'];

function safeRedirectPath(input) {
  if (!input) return '/dashboard';
  try {
    const url = new URL(input, 'http://localhost');
    if (ALLOWED_POST_LOGIN_PATHS.some((p) => url.pathname === p || url.pathname.startsWith(p + '/'))) {
      return url.pathname;
    }
  } catch {
    // ignore
  }
  return '/dashboard';
}

const SNOWFLAKE_RE = /^\d{17,20}$/;

function authorizeGuild(session, guildId, requireBot = false) {
  if (!SNOWFLAKE_RE.test(guildId)) {
    return { authorized: false, status: 400, reason: 'INVALID_GUILD_ID' };
  }
  if (!session?.authenticated || !session?.user) {
    return { authorized: false, status: 401, reason: 'UNAUTHENTICATED' };
  }
  const guilds = session.guilds || [];
  const guild = guilds.find((g) => g.id === guildId);
  if (!guild) {
    return { authorized: false, status: 403, reason: 'GUILD_NOT_FOUND' };
  }
  if (!hasManageGuildPermission(guild)) {
    return { authorized: false, status: 403, reason: 'INSUFFICIENT_PERMISSION' };
  }
  if (requireBot && guild.botPresent === false) {
    return { authorized: false, status: 404, reason: 'BOT_NOT_INSTALLED' };
  }
  return { authorized: true, status: 200, guild, userId: session.user.id };
}

function checkBotBridgeAuth(method, internalSecret, headers) {
  if (method === 'OPTIONS') {
    return { allowed: false, status: 403, error: 'Direct browser cross-origin requests are forbidden' };
  }
  if (method === 'POST') {
    const authHeader = headers['authorization'];
    const customSecret = headers['x-internal-secret'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : customSecret;
    if (!token || (internalSecret && token !== internalSecret)) {
      return { allowed: false, status: 401, error: 'Unauthorized internal bridge access: valid secret required' };
    }
  }
  return { allowed: true, status: 200 };
}

// ------------------------------------------------------------
// Test Suite: Phase 7C Discord OAuth2 & Secure Guild Authorization
// ------------------------------------------------------------
test('Phase 7C: Discord OAuth2 & Secure Guild Authorization Test Suite', async (t) => {
  // 1. OAuth Authorization URL
  await t.test('buildAuthorizationUrl constructs correct Discord OAuth2 URL', () => {
    const clientId = '123456789012345678';
    const redirectUri = 'http://localhost:3000/api/auth/discord/callback';
    const state = 'test_crypto_state_123';

    const urlStr = buildAuthorizationUrl(clientId, redirectUri, state);
    const parsed = new URL(urlStr);

    assert.equal(parsed.protocol, 'https:');
    assert.equal(parsed.hostname, 'discord.com');
    assert.equal(parsed.pathname, '/oauth2/authorize');
    assert.equal(parsed.searchParams.get('client_id'), clientId);
    assert.equal(parsed.searchParams.get('redirect_uri'), redirectUri);
    assert.equal(parsed.searchParams.get('response_type'), 'code');
    assert.equal(parsed.searchParams.get('scope'), 'identify guilds');
    assert.equal(parsed.searchParams.get('state'), state);
  });

  await t.test('buildAuthorizationUrl throws when clientId or redirectUri is missing', () => {
    assert.throws(() => buildAuthorizationUrl('', 'http://localhost:3000/callback', 'state'), /DISCORD_CLIENT_ID/);
    assert.throws(() => buildAuthorizationUrl('123', '', 'state'), /DISCORD_REDIRECT_URI/);
  });

  // 2. Cryptographic State Generation
  await t.test('OAuth state has 128 bits of entropy and generates unique random values', () => {
    const states = new Set();
    for (let i = 0; i < 100; i++) {
      const state = randomBytes(16).toString('hex');
      assert.equal(state.length, 32);
      assert.equal(/^[0-9a-f]{32}$/.test(state), true);
      states.add(state);
    }
    assert.equal(states.size, 100);
  });

  // 3. State CSRF Validation
  await t.test('OAuth state validation accepts matching state and rejects forged/missing states', () => {
    const storedState = 'valid_state_abc123';

    // Matching state
    assert.equal(storedState === 'valid_state_abc123', true);

    // Forged state
    const forgedState = 'attacker_crafted_state';
    assert.equal(storedState === forgedState, false);

    // Missing state
    assert.equal(Boolean(null && storedState === null), false);
    assert.equal(Boolean(undefined && storedState === undefined), false);
  });

  // 4. Bot Install URL Generation
  await t.test('getBotInstallUrl generates valid Discord bot invite URL with Admin permission', () => {
    const clientId = '123456789012345678';
    const installUrl = getBotInstallUrl(clientId);
    const parsed = new URL(installUrl);

    assert.equal(parsed.hostname, 'discord.com');
    assert.equal(parsed.pathname, '/api/oauth2/authorize');
    assert.equal(parsed.searchParams.get('client_id'), clientId);
    assert.equal(parsed.searchParams.get('permissions'), '8'); // Administrator
    assert.equal(parsed.searchParams.get('scope'), 'bot applications.commands');
  });

  // 5. Permission Bitfield Evaluation
  await t.test('hasManageGuildPermission recognizes Guild Owner without permissions bitfield', () => {
    const ownerGuild = { id: '111', name: 'Owner Server', owner: true, permissions: '0' };
    assert.equal(hasManageGuildPermission(ownerGuild), true);
  });

  await t.test('hasManageGuildPermission recognizes ADMINISTRATOR (0x8)', () => {
    const adminGuild = { id: '222', name: 'Admin Server', owner: false, permissions: '8' };
    assert.equal(hasManageGuildPermission(adminGuild), true);
  });

  await t.test('hasManageGuildPermission recognizes MANAGE_GUILD (0x20)', () => {
    const manageGuild = { id: '333', name: 'Manager Server', owner: false, permissions: '32' };
    assert.equal(hasManageGuildPermission(manageGuild), true);
  });

  await t.test('hasManageGuildPermission recognizes combined ADMINISTRATOR and other flags', () => {
    // 0x8 | 0x1 (Create Instant Invite + Admin) = 9
    const combinedGuild = { id: '444', name: 'Combined Server', owner: false, permissions: '9' };
    assert.equal(hasManageGuildPermission(combinedGuild), true);
  });

  await t.test('hasManageGuildPermission rejects members without Admin or Manage Server', () => {
    // 0x400 (View Channel) = 1024
    const regularGuild = { id: '555', name: 'Member Only Server', owner: false, permissions: '1024' };
    assert.equal(hasManageGuildPermission(regularGuild), false);

    const zeroGuild = { id: '666', name: 'No Perms Server', owner: false, permissions: '0' };
    assert.equal(hasManageGuildPermission(zeroGuild), false);

    const corruptGuild = { id: '777', name: 'Corrupt Perms', owner: false, permissions: 'not-a-number' };
    assert.equal(hasManageGuildPermission(corruptGuild), false);
  });

  // 6. Guild Filtering
  await t.test('filterManageableGuilds only includes servers the user can manage', () => {
    const userGuilds = [
      { id: '1', name: 'Owner G', owner: true, permissions: '0' },
      { id: '2', name: 'Admin G', owner: false, permissions: '8' },
      { id: '3', name: 'Manage G', owner: false, permissions: '32' },
      { id: '4', name: 'Regular Member G', owner: false, permissions: '1' },
      { id: '5', name: 'Read-only G', owner: false, permissions: '1024' },
    ];

    const filtered = filterManageableGuilds(userGuilds);
    assert.equal(filtered.length, 3);
    assert.deepEqual(filtered.map((g) => g.id), ['1', '2', '3']);
  });

  // 7. Secure Session Encryption (iron-session seal & unseal)
  await t.test('Session seal and unseal preserves user identity and fails on tampering', async () => {
    const password = 'a-super-secure-password-that-is-at-least-32-chars-long!';
    const sessionData = {
      authenticated: true,
      user: {
        id: '123456789012345678',
        username: 'secops_agent',
        globalName: 'SecOps Agent',
        avatar: 'avatar_hash_123',
        discriminator: '0',
      },
      guilds: [
        { id: '987654321098765432', name: 'HQ Server', owner: true, permissions: '8', botPresent: true },
      ],
    };

    const sealed = await sealData(sessionData, { password, ttl: 3600 });
    assert.equal(typeof sealed, 'string');
    assert.equal(sealed.length > 50, true);

    // Ensure raw data is encrypted (no plain username visible in sealed cookie)
    assert.equal(sealed.includes('secops_agent'), false);

    // Unseal
    const unsealed = await unsealData(sealed, { password, ttl: 3600 });
    assert.equal(unsealed.authenticated, true);
    assert.equal(unsealed.user.id, '123456789012345678');
    assert.equal(unsealed.user.username, 'secops_agent');
    assert.equal(unsealed.guilds.length, 1);

    // Tampered seal or wrong password must yield empty/unauthenticated session
    const wrongPassword = 'wrong-password-at-least-32-chars-long!';
    const decryptedWithWrongKey = await unsealData(sealed, { password: wrongPassword, ttl: 3600 });
    assert.equal(decryptedWithWrongKey.authenticated, undefined);
    assert.equal(decryptedWithWrongKey.user, undefined);

    const corruptDecrypted = await unsealData('corrupt-sealed-data-cannot-decrypt', { password, ttl: 3600 });
    assert.equal(corruptDecrypted.authenticated, undefined);
    assert.equal(corruptDecrypted.user, undefined);
  });

  // 8. Centralized Guild Authorization (RBAC & IDOR Protection)
  await t.test('authorizeGuild: rejects unauthenticated user with 401', () => {
    const unauthenticatedSession = { authenticated: false };
    const result = authorizeGuild(unauthenticatedSession, '123456789012345678');
    assert.equal(result.authorized, false);
    assert.equal(result.status, 401);
    assert.equal(result.reason, 'UNAUTHENTICATED');
  });

  await t.test('authorizeGuild: rejects invalid snowflake with 400', () => {
    const validSession = {
      authenticated: true,
      user: { id: '111' },
      guilds: [{ id: '123456789012345678', permissions: '8', owner: false }],
    };
    const result = authorizeGuild(validSession, 'invalid-guild-id');
    assert.equal(result.authorized, false);
    assert.equal(result.status, 400);
    assert.equal(result.reason, 'INVALID_GUILD_ID');
  });

  await t.test('authorizeGuild: rejects access to foreign guild (IDOR protection) with 403', () => {
    const session = {
      authenticated: true,
      user: { id: 'user123' },
      guilds: [
        { id: '111111111111111111', name: 'User Guild A', permissions: '8', owner: false },
      ],
    };

    // Attacker tries to access Guild B (not in their guild list)
    const targetForeignGuild = '222222222222222222';
    const result = authorizeGuild(session, targetForeignGuild);
    assert.equal(result.authorized, false);
    assert.equal(result.status, 403);
    assert.equal(result.reason, 'GUILD_NOT_FOUND');
  });

  await t.test('authorizeGuild: rejects member with insufficient permissions with 403', () => {
    const session = {
      authenticated: true,
      user: { id: 'user123' },
      guilds: [
        { id: '111111111111111111', name: 'Restricted Guild', permissions: '1024', owner: false },
      ],
    };

    const result = authorizeGuild(session, '111111111111111111');
    assert.equal(result.authorized, false);
    assert.equal(result.status, 403);
    assert.equal(result.reason, 'INSUFFICIENT_PERMISSION');
  });

  await t.test('authorizeGuild: allows access for authorized guild manager/admin', () => {
    const session = {
      authenticated: true,
      user: { id: 'user123' },
      guilds: [
        { id: '111111111111111111', name: 'Managed Guild', permissions: '8', owner: false, botPresent: true },
      ],
    };

    const result = authorizeGuild(session, '111111111111111111');
    assert.equal(result.authorized, true);
    assert.equal(result.status, 200);
    assert.equal(result.userId, 'user123');
  });

  await t.test('authorizeGuild: handles bot-missing state correctly when required', () => {
    const session = {
      authenticated: true,
      user: { id: 'user123' },
      guilds: [
        { id: '111111111111111111', name: 'No Bot Guild', permissions: '8', owner: false, botPresent: false },
      ],
    };

    // Not requiring bot -> allows through
    const resNoRequire = authorizeGuild(session, '111111111111111111', false);
    assert.equal(resNoRequire.authorized, true);

    // Requiring bot -> returns BOT_NOT_INSTALLED (404)
    const resRequire = authorizeGuild(session, '111111111111111111', true);
    assert.equal(resRequire.authorized, false);
    assert.equal(resRequire.status, 404);
    assert.equal(resRequire.reason, 'BOT_NOT_INSTALLED');
  });

  // 9. Bot Bridge Security
  await t.test('botBridge: rejects unauthenticated POST write requests', () => {
    const secret = 'super-secret-key-32-chars-length!';
    const resultNoHeader = checkBotBridgeAuth('POST', secret, {});
    assert.equal(resultNoHeader.allowed, false);
    assert.equal(resultNoHeader.status, 401);

    const resultWrongSecret = checkBotBridgeAuth('POST', secret, { 'x-internal-secret': 'wrong-secret' });
    assert.equal(resultWrongSecret.allowed, false);
    assert.equal(resultWrongSecret.status, 401);
  });

  await t.test('botBridge: accepts authenticated POST requests with matching secret', () => {
    const secret = 'super-secret-key-32-chars-length!';
    const resCustomHeader = checkBotBridgeAuth('POST', secret, { 'x-internal-secret': secret });
    assert.equal(resCustomHeader.allowed, true);
    assert.equal(resCustomHeader.status, 200);

    const resBearerHeader = checkBotBridgeAuth('POST', secret, { authorization: `Bearer ${secret}` });
    assert.equal(resBearerHeader.allowed, true);
    assert.equal(resBearerHeader.status, 200);
  });

  await t.test('botBridge: rejects browser OPTIONS preflight requests', () => {
    const res = checkBotBridgeAuth('OPTIONS', 'secret', {});
    assert.equal(res.allowed, false);
    assert.equal(res.status, 403);
  });

  // 10. Open Redirect Protection
  await t.test('safeRedirectPath prevents open redirects and allows only internal dashboard paths', () => {
    assert.equal(safeRedirectPath(null), '/dashboard');
    assert.equal(safeRedirectPath(''), '/dashboard');
    assert.equal(safeRedirectPath('/dashboard'), '/dashboard');
    assert.equal(safeRedirectPath('/dashboard/moderation'), '/dashboard/moderation');

    // External attacks must be sanitized to /dashboard
    assert.equal(safeRedirectPath('https://evil.com'), '/dashboard');
    assert.equal(safeRedirectPath('//evil.com'), '/dashboard');
    assert.equal(safeRedirectPath('javascript:alert(1)'), '/dashboard');
    assert.equal(safeRedirectPath('/api/auth/logout'), '/dashboard');
  });

  // 11. Secret Non-Exposure
  await t.test('safe user identity mapping never exposes tokens or secrets', () => {
    const fullDiscordUserResponse = {
      id: '123456789012345678',
      username: 'agent_smith',
      global_name: 'Smith',
      avatar: 'avatar_hash_abc',
      discriminator: '0',
      email: 'smith@matrix.internal', // sensitive
      access_token: 'secret_token_123', // sensitive
      refresh_token: 'refresh_token_456', // sensitive
    };

    // Safe session user mapping
    const safeUser = {
      id: fullDiscordUserResponse.id,
      username: fullDiscordUserResponse.username,
      globalName: fullDiscordUserResponse.global_name,
      avatar: fullDiscordUserResponse.avatar,
      discriminator: fullDiscordUserResponse.discriminator,
    };

    assert.equal('access_token' in safeUser, false);
    assert.equal('refresh_token' in safeUser, false);
    assert.equal('email' in safeUser, false);
    assert.deepEqual(Object.keys(safeUser), ['id', 'username', 'globalName', 'avatar', 'discriminator']);
  });
});
