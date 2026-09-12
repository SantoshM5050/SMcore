import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ProtectionType,
  AutoModPunishment,
  GuildProtectionSettings,
  AntiSpamConfigSchema,
  MassMentionConfigSchema,
  InviteFilterConfigSchema,
  ExternalLinkConfigSchema,
  KeywordFilterConfigSchema,
} from '@smcore/shared';
import { AntiSpamService } from '../services/protection/antiSpamService';
import { MentionProtectionService } from '../services/protection/mentionProtectionService';
import { InviteFilterService } from '../services/protection/inviteFilterService';
import { ExternalLinkService } from '../services/protection/externalLinkService';
import { KeywordFilterService } from '../services/protection/keywordFilterService';
import { ProtectionConfigService } from '../services/protection/protectionConfigService';

describe('AutoMod & Protection Shield — Unit Test Suite', () => {
  let baseSettings: GuildProtectionSettings;

  beforeEach(() => {
    AntiSpamService.resetTracker();
    baseSettings = ProtectionConfigService.getDefaultSettings('111111111111111111');
  });

  describe('1. Anti-Spam Detection Engine', () => {
    it('allows message frequency below configured threshold', () => {
      baseSettings.antiSpamEnabled = true;
      baseSettings.antiSpamMessageLimit = 5;
      baseSettings.antiSpamWindowSeconds = 5;

      const now = 1000000;
      for (let i = 0; i < 4; i++) {
        const res = AntiSpamService.checkSpam('g1', 'u1', `message ${i}`, baseSettings, now + i * 100);
        assert.equal(res.violated, false);
      }
    });

    it('detects when message frequency threshold is exceeded', () => {
      baseSettings.antiSpamEnabled = true;
      baseSettings.antiSpamMessageLimit = 4;
      baseSettings.antiSpamWindowSeconds = 5;

      const now = 1000000;
      // Send 4 messages (at limit)
      for (let i = 0; i < 4; i++) {
        AntiSpamService.checkSpam('g1', 'u1', `message ${i}`, baseSettings, now + i * 100);
      }

      // 5th message exceeds limit
      const burstViolation = AntiSpamService.checkSpam('g1', 'u1', '5th burst message', baseSettings, now + 500);
      assert.equal(burstViolation.violated, true);
      assert.equal(burstViolation.protectionType, ProtectionType.SPAM);
    });

    it('detects repeated duplicate messages', () => {
      baseSettings.antiSpamEnabled = true;
      baseSettings.duplicateMessageLimit = 3;
      baseSettings.antiSpamWindowSeconds = 10;

      const now = 1000000;
      const spamText = 'BUY CHEAP NITRO NOW AT MY LINK';

      const res1 = AntiSpamService.checkSpam('g1', 'u1', spamText, baseSettings, now);
      assert.equal(res1.violated, false);

      const res2 = AntiSpamService.checkSpam('g1', 'u1', spamText, baseSettings, now + 1000);
      assert.equal(res2.violated, false);

      // 3rd duplicate message triggers duplicate spam violation
      const res3 = AntiSpamService.checkSpam('g1', 'u1', spamText, baseSettings, now + 2000);
      assert.equal(res3.violated, true);
      assert.equal(res3.protectionType, ProtectionType.SPAM);
      assert.match(res3.reason || '', /duplicate messages/i);
    });

    it('resets message count after sliding window expires', () => {
      baseSettings.antiSpamEnabled = true;
      baseSettings.antiSpamMessageLimit = 3;
      baseSettings.antiSpamWindowSeconds = 2; // 2 seconds window

      const t0 = 1000000;
      AntiSpamService.checkSpam('g1', 'u1', 'msg 1', baseSettings, t0);
      AntiSpamService.checkSpam('g1', 'u1', 'msg 2', baseSettings, t0 + 500);

      // Wait 3 seconds (outside 2s window)
      const tAfter = t0 + 3500;
      const resAfter = AntiSpamService.checkSpam('g1', 'u1', 'msg 3', baseSettings, tAfter);
      assert.equal(resAfter.violated, false);
    });

    it('maintains strict per-user and per-guild isolation', () => {
      baseSettings.antiSpamEnabled = true;
      baseSettings.antiSpamMessageLimit = 3;

      const now = 1000000;
      // User 1 sends 3 messages in Guild A
      AntiSpamService.checkSpam('gA', 'u1', 'hi', baseSettings, now);
      AntiSpamService.checkSpam('gA', 'u1', 'hi2', baseSettings, now + 100);
      AntiSpamService.checkSpam('gA', 'u1', 'hi3', baseSettings, now + 200);

      // User 2 in Guild A is unaffected
      const user2Result = AntiSpamService.checkSpam('gA', 'u2', 'fresh', baseSettings, now + 300);
      assert.equal(user2Result.violated, false);

      // User 1 in Guild B is unaffected
      const guildBResult = AntiSpamService.checkSpam('gB', 'u1', 'fresh', baseSettings, now + 300);
      assert.equal(guildBResult.violated, false);
    });
  });

  describe('2. Mass Mention Protection Engine', () => {
    it('allows normal mention usage', () => {
      baseSettings.massMentionEnabled = true;
      baseSettings.maxUserMentions = 5;
      baseSettings.maxRoleMentions = 3;
      baseSettings.maxTotalMentions = 6;
      baseSettings.everyoneMentionAllowed = false;

      const res = MentionProtectionService.checkMentions(
        { userCount: 2, roleCount: 1, hasEveryone: false, hasHere: false },
        baseSettings
      );
      assert.equal(res.violated, false);
    });

    it('detects excessive user mentions', () => {
      baseSettings.massMentionEnabled = true;
      baseSettings.maxUserMentions = 3;

      const res = MentionProtectionService.checkMentions(
        { userCount: 4, roleCount: 0, hasEveryone: false, hasHere: false },
        baseSettings
      );
      assert.equal(res.violated, true);
      assert.equal(res.protectionType, ProtectionType.MASS_MENTION);
      assert.match(res.reason || '', /user mention limit/i);
    });

    it('detects excessive role mentions', () => {
      baseSettings.massMentionEnabled = true;
      baseSettings.maxRoleMentions = 2;

      const res = MentionProtectionService.checkMentions(
        { userCount: 1, roleCount: 3, hasEveryone: false, hasHere: false },
        baseSettings
      );
      assert.equal(res.violated, true);
      assert.equal(res.protectionType, ProtectionType.MASS_MENTION);
      assert.match(res.reason || '', /role mention limit/i);
    });

    it('blocks unauthorized @everyone and @here mentions', () => {
      baseSettings.massMentionEnabled = true;
      baseSettings.everyoneMentionAllowed = false;

      const resEveryone = MentionProtectionService.checkMentions(
        { userCount: 0, roleCount: 0, hasEveryone: true, hasHere: false },
        baseSettings
      );
      assert.equal(resEveryone.violated, true);
      assert.match(resEveryone.reason || '', /@everyone/i);

      const resHere = MentionProtectionService.checkMentions(
        { userCount: 0, roleCount: 0, hasEveryone: false, hasHere: true },
        baseSettings
      );
      assert.equal(resHere.violated, true);
      assert.match(resHere.reason || '', /@everyone or @here/i);
    });
  });

  describe('3. Discord Invite Filter Engine', () => {
    it('detects standard Discord invite links', () => {
      baseSettings.inviteFilterEnabled = true;

      const texts = [
        'Join my awesome community: https://discord.gg/minecraft123',
        'http://discord.com/invite/community-hub',
        'Check out discordapp.com/invite/gaming-lounge now!',
      ];

      for (const text of texts) {
        const res = InviteFilterService.checkInvites(text, baseSettings);
        assert.equal(res.violated, true);
        assert.equal(res.protectionType, ProtectionType.DISCORD_INVITE);
      }
    });

    it('ignores normal non-invite Discord URLs and other domains', () => {
      baseSettings.inviteFilterEnabled = true;

      const validUrls = [
        'Check documentation: https://discord.com/developers/docs/intro',
        'Read this article: https://discord.com/blog/welcome',
        'https://github.com/my-project',
      ];

      for (const text of validUrls) {
        const res = InviteFilterService.checkInvites(text, baseSettings);
        assert.equal(res.violated, false);
      }
    });

    it('allows explicitly allowlisted Discord invite codes', () => {
      baseSettings.inviteFilterEnabled = true;
      baseSettings.allowedInviteGuilds = ['partner-hub', 'official-server'];

      const allowedMsg = 'Join our partner server at https://discord.gg/partner-hub';
      const resAllowed = InviteFilterService.checkInvites(allowedMsg, baseSettings);
      assert.equal(resAllowed.violated, false);

      const unapprovedMsg = 'Join random server at https://discord.gg/unapproved-code';
      const resBlocked = InviteFilterService.checkInvites(unapprovedMsg, baseSettings);
      assert.equal(resBlocked.violated, true);
    });
  });

  describe('4. External Link Filter & Subdomain Security', () => {
    it('correctly normalizes hostnames', () => {
      assert.equal(ExternalLinkService.normalizeHostname('https://WWW.YouTube.com/watch?v=123'), 'youtube.com');
      assert.equal(ExternalLinkService.normalizeHostname('http://m.github.com/repo'), 'm.github.com');
      assert.equal(ExternalLinkService.normalizeHostname('example.org/path/test.'), 'example.org');
    });

    it('prevents subdomain prefix spoofing (youtube.com.evil.example attack)', () => {
      // youtube.com is allowed, but attacker registers youtube.com.evil.example
      const isMatch = ExternalLinkService.isDomainMatch('youtube.com.evil.example', 'youtube.com');
      assert.equal(isMatch, false, 'youtube.com.evil.example must NOT match allowed youtube.com');

      // Legitimate subdomains should match
      assert.equal(ExternalLinkService.isDomainMatch('m.youtube.com', 'youtube.com'), true);
      assert.equal(ExternalLinkService.isDomainMatch('music.youtube.com', 'youtube.com'), true);
      assert.equal(ExternalLinkService.isDomainMatch('youtube.com', 'youtube.com'), true);
    });

    it('blocks links from explicitly blocked domains', () => {
      baseSettings.externalLinkFilterEnabled = true;
      baseSettings.blockedDomains = ['phishing-scam.xyz', 'malicious.net'];

      const res = ExternalLinkService.checkExternalLinks(
        'Get free prizes here: https://phishing-scam.xyz/claim',
        baseSettings
      );
      assert.equal(res.violated, true);
      assert.equal(res.protectionType, ProtectionType.EXTERNAL_LINK);
      assert.match(res.reason || '', /prohibited domain/i);
    });

    it('enforces domain allowlist policy', () => {
      baseSettings.externalLinkFilterEnabled = true;
      baseSettings.allowedDomains = ['github.com', 'youtube.com'];

      // Allowed domain passes
      const resAllowed = ExternalLinkService.checkExternalLinks(
        'See code at https://github.com/owner/repo',
        baseSettings
      );
      assert.equal(resAllowed.violated, false);

      // Unapproved external domain is blocked
      const resUnapproved = ExternalLinkService.checkExternalLinks(
        'Visit my site at https://unknown-blog.com',
        baseSettings
      );
      assert.equal(resUnapproved.violated, true);
      assert.match(resUnapproved.reason || '', /unapproved external domain/i);
    });
  });

  describe('5. Prohibited Keyword Filter Engine', () => {
    it('detects prohibited keywords case-insensitively', () => {
      baseSettings.keywordFilterEnabled = true;
      baseSettings.prohibitedKeywords = ['badword', 'scam site'];

      const res1 = KeywordFilterService.checkKeywords('You are a BADWORD!', baseSettings);
      assert.equal(res1.violated, true);
      assert.equal(res1.protectionType, ProtectionType.PROHIBITED_KEYWORD);

      const res2 = KeywordFilterService.checkKeywords('Check out this Scam Site now', baseSettings);
      assert.equal(res2.violated, true);
    });

    it('handles Unicode normalized variations and zero-width characters', () => {
      baseSettings.keywordFilterEnabled = true;
      baseSettings.prohibitedKeywords = ['illegal'];

      // Text with zero-width spaces: il\u200Blegal
      const bypassedText = 'il\u200Blegal text here';
      const res = KeywordFilterService.checkKeywords(bypassedText, baseSettings);
      assert.equal(res.violated, true);
    });

    it('avoids naive substring false positives using word boundaries', () => {
      baseSettings.keywordFilterEnabled = true;
      baseSettings.prohibitedKeywords = ['ass'];

      // "class" and "assassin" should NOT trigger single-word "ass"
      const harmless1 = KeywordFilterService.checkKeywords('I am attending a math class today.', baseSettings);
      assert.equal(harmless1.violated, false);

      const harmless2 = KeywordFilterService.checkKeywords('He played the role of an assassin.', baseSettings);
      assert.equal(harmless2.violated, false);

      // Exact word triggers
      const violation = KeywordFilterService.checkKeywords('He is acting like an ass.', baseSettings);
      assert.equal(violation.violated, true);
    });
  });

  describe('6. AutoMod Configuration Schemas & Bounds', () => {
    it('validates anti-spam schema limits', () => {
      assert.equal(AntiSpamConfigSchema.safeParse({ enabled: true, messageLimit: 5, windowSeconds: 5 }).success, true);
      // messageLimit < 2 rejected
      assert.equal(AntiSpamConfigSchema.safeParse({ enabled: true, messageLimit: 1 }).success, false);
      // windowSeconds > 60 rejected
      assert.equal(AntiSpamConfigSchema.safeParse({ enabled: true, windowSeconds: 120 }).success, false);
    });

    it('validates mass mention schema limits', () => {
      assert.equal(MassMentionConfigSchema.safeParse({ enabled: true, maxUserMentions: 10 }).success, true);
      // maxUserMentions > 50 rejected
      assert.equal(MassMentionConfigSchema.safeParse({ enabled: true, maxUserMentions: 51 }).success, false);
    });

    it('validates keyword filter array bounds', () => {
      assert.equal(KeywordFilterConfigSchema.safeParse({ enabled: true, prohibitedKeywords: ['word1', 'word2'] }).success, true);
      // Over 500 keywords rejected
      const tooManyKeywords = Array.from({ length: 501 }, (_, i) => `word${i}`);
      assert.equal(KeywordFilterConfigSchema.safeParse({ enabled: true, prohibitedKeywords: tooManyKeywords }).success, false);
    });
  });
});
