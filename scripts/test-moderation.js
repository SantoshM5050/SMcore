const assert = require('assert');

console.log('🧪 Starting SMCore Enterprise Moderation & Security Test Suite...\n');

// 1. Test Warning Escalation Rule Engine
function calculateEscalation(activeWarningCount) {
  if (activeWarningCount >= 7) return { action: 'BAN', durationMinutes: null };
  if (activeWarningCount >= 5) return { action: 'TIMEOUT', durationMinutes: 1440 };
  if (activeWarningCount >= 3) return { action: 'TIMEOUT', durationMinutes: 60 };
  return null;
}

console.log('Testing Warning Escalation Engine:');
assert.strictEqual(calculateEscalation(1), null, '1 warning should not trigger escalation');
assert.strictEqual(calculateEscalation(2), null, '2 warnings should not trigger escalation');
const esc3 = calculateEscalation(3);
assert.ok(esc3 && esc3.action === 'TIMEOUT' && esc3.durationMinutes === 60, '3 warnings should trigger 60m timeout');
const esc5 = calculateEscalation(5);
assert.ok(esc5 && esc5.action === 'TIMEOUT' && esc5.durationMinutes === 1440, '5 warnings should trigger 24h timeout');
const esc7 = calculateEscalation(7);
assert.ok(esc7 && esc7.action === 'BAN', '7 warnings should trigger ban');
console.log('  ✅ Warning Escalation Engine passed.');

// 2. Test Anti-Invite Regex Pattern
const INVITE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:discord\.(?:gg|io|me|li)|discord(?:app)?\.com\/invite)\/([a-zA-Z0-9-]{2,32})/i;

console.log('\nTesting Anti-Invite Pattern Matching:');
assert.ok(INVITE_REGEX.test('Join our cool server: discord.gg/test1234'), 'Should catch discord.gg invites');
assert.ok(INVITE_REGEX.test('https://discord.com/invite/moderation'), 'Should catch discord.com/invite links');
assert.ok(INVITE_REGEX.test('Check this out discord.me/coolgang'), 'Should catch discord.me links');
assert.ok(!INVITE_REGEX.test('Hello there! How are you doing today?'), 'Should pass normal text');
assert.ok(!INVITE_REGEX.test('https://google.com/search?q=discord'), 'Should pass search queries');
console.log('  ✅ Anti-Invite Pattern Matching passed.');

// 3. Test Anti-Link Domain Whitelisting
function isLinkAllowed(content, whitelistedDomains, blockAll) {
  if (blockAll) return false;
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const matches = content.match(urlRegex);
  if (!matches) return true; // no links

  for (const urlStr of matches) {
    try {
      const parsed = new URL(urlStr);
      const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
      const isWhitelisted = whitelistedDomains.some((d) => hostname === d || hostname.endsWith(`.${d}`));
      if (!isWhitelisted) return false;
    } catch {
      return false;
    }
  }
  return true;
}

console.log('\nTesting Anti-Link Domain Whitelist/Blacklist Filter:');
const whitelist = ['youtube.com', 'twitch.tv', 'discord.com'];
assert.ok(isLinkAllowed('Check this video: https://www.youtube.com/watch?v=123', whitelist, false), 'Should allow youtube.com');
assert.ok(isLinkAllowed('Stream live at https://twitch.tv/gamer', whitelist, false), 'Should allow twitch.tv');
assert.ok(!isLinkAllowed('Dangerous link: https://grabify.link/track', whitelist, false), 'Should block non-whitelisted domain');
assert.ok(!isLinkAllowed('Blocked under strict mode: https://youtube.com', whitelist, true), 'Should block all under strict mode');
console.log('  ✅ Anti-Link Domain Filter passed.');

// 4. Test Anti-Spam Rate Sliding Window Engine
class RateTracker {
  constructor(maxMessages, windowMs) {
    this.maxMessages = maxMessages;
    this.windowMs = windowMs;
    this.history = new Map();
  }

  record(userId) {
    const now = Date.now();
    const timestamps = (this.history.get(userId) || []).filter((t) => now - t < this.windowMs);
    timestamps.push(now);
    this.history.set(userId, timestamps);
    return timestamps.length > this.maxMessages;
  }
}

console.log('\nTesting Anti-Spam Rate Sliding Window Tracker:');
const tracker = new RateTracker(4, 5000); // 4 messages per 5s
assert.strictEqual(tracker.record('user1'), false, 'Msg 1 should pass');
assert.strictEqual(tracker.record('user1'), false, 'Msg 2 should pass');
assert.strictEqual(tracker.record('user1'), false, 'Msg 3 should pass');
assert.strictEqual(tracker.record('user1'), false, 'Msg 4 should pass');
assert.strictEqual(tracker.record('user1'), true, 'Msg 5 within window should trigger spam detection');
console.log('  ✅ Anti-Spam Rate Sliding Window Tracker passed.');

// 5. Test Hierarchy Protection Logic
function canModerate(moderatorId, moderatorHighestRolePos, targetId, targetHighestRolePos, guildOwnerId, botUserId) {
  if (targetId === guildOwnerId) return { allowed: false, reason: 'Target is the server owner.' };
  if (targetId === botUserId) return { allowed: false, reason: 'Cannot moderate the bot itself.' };
  if (targetId === moderatorId) return { allowed: false, reason: 'Cannot target yourself.' };
  if (moderatorId === guildOwnerId) return { allowed: true };
  if (moderatorHighestRolePos <= targetHighestRolePos) {
    return { allowed: false, reason: 'Target role position is equal to or higher than moderator.' };
  }
  return { allowed: true };
}

console.log('\nTesting Hierarchy Protection Logic:');
assert.strictEqual(canModerate('mod1', 10, 'owner1', 99, 'owner1', 'bot1').allowed, false, 'Cannot moderate owner');
assert.strictEqual(canModerate('mod1', 10, 'bot1', 12, 'owner1', 'bot1').allowed, false, 'Cannot moderate bot');
assert.strictEqual(canModerate('mod1', 10, 'mod1', 10, 'owner1', 'bot1').allowed, false, 'Cannot moderate self');
assert.strictEqual(canModerate('mod1', 5, 'target1', 8, 'owner1', 'bot1').allowed, false, 'Cannot moderate higher role');
assert.strictEqual(canModerate('mod1', 10, 'target1', 5, 'owner1', 'bot1').allowed, true, 'Can moderate lower role');
assert.strictEqual(canModerate('owner1', 1, 'admin1', 20, 'owner1', 'bot1').allowed, true, 'Owner can moderate anyone');
console.log('  ✅ Hierarchy Protection Logic passed.');

console.log('\n✨ ALL SMCore UNIT TESTS PASSED SUCCESSFULLY! (5/5 suites)\n');
