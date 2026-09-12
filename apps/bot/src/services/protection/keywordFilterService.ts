import { GuildProtectionSettings, ProtectionType } from '@smcore/shared';
import { DetectionResult } from './protectionTypes';

export class KeywordFilterService {
  /**
   * Normalizes text by unidecoding, lowercasing, and removing zero-width characters
   */
  public static normalizeText(text: string): string {
    return text
      .normalize('NFKD')
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width characters
      .toLowerCase();
  }

  /**
   * Escapes regex special characters in a keyword
   */
  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Evaluates if normalized content matches any prohibited keywords or phrases
   */
  public static checkKeywords(
    content: string,
    settings: GuildProtectionSettings
  ): DetectionResult {
    if (!settings.keywordFilterEnabled || settings.prohibitedKeywords.length === 0) {
      return { violated: false };
    }

    const normalizedContent = this.normalizeText(content);

    for (const keyword of settings.prohibitedKeywords) {
      const normalizedKeyword = this.normalizeText(keyword).trim();
      if (!normalizedKeyword) continue;

      let matched = false;

      if (normalizedKeyword.includes(' ')) {
        // Multi-word phrase matching
        matched = normalizedContent.includes(normalizedKeyword);
      } else {
        // Single word matching with word boundaries to avoid false positives (e.g. "assassin" vs "ass")
        const regex = new RegExp(`\\b${this.escapeRegex(normalizedKeyword)}\\b`, 'i');
        matched = regex.test(normalizedContent);
      }

      if (matched) {
        return {
          violated: true,
          protectionType: ProtectionType.PROHIBITED_KEYWORD,
          reason: `Contained prohibited keyword or phrase ("${keyword}")`,
          punishment: settings.keywordPunishment,
          deleteMessage: settings.deleteViolatingMessages,
          metadata: { matchedKeyword: keyword },
        };
      }
    }

    return { violated: false };
  }
}
