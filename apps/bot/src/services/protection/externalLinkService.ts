import { GuildProtectionSettings, ProtectionType } from '@smcore/shared';
import { DetectionResult } from './protectionTypes';

export class ExternalLinkService {
  // Regex to extract URLs from text
  private static readonly URL_REGEX =
    /(?:https?:\/\/|www\.)[^\s<>()]+|(?:\b[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s<>()]*)?)/gi;

  /**
   * Normalizes a hostname for safe comparison (lowercase, strip www, remove port/trailing dot)
   */
  public static normalizeHostname(rawUrl: string): string | null {
    try {
      let urlString = rawUrl.trim().toLowerCase();
      if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
        urlString = 'https://' + urlString;
      }
      const parsed = new URL(urlString);
      let hostname = parsed.hostname.toLowerCase();

      // Remove trailing dot if present
      if (hostname.endsWith('.')) {
        hostname = hostname.slice(0, -1);
      }

      // Strip leading www.
      if (hostname.startsWith('www.')) {
        hostname = hostname.slice(4);
      }

      return hostname;
    } catch {
      return null;
    }
  }

  /**
   * Checks if a candidate hostname strictly matches or is a valid subdomain of a target domain
   * Prevents attacker.com from spoofing youtube.com.attacker.com
   */
  public static isDomainMatch(hostname: string, targetDomain: string): boolean {
    const normalizedTarget = targetDomain.trim().toLowerCase().replace(/^www\./, '');
    if (hostname === normalizedTarget) {
      return true;
    }
    return hostname.endsWith('.' + normalizedTarget);
  }

  /**
   * Extracts all unique normalized hostnames from a message
   */
  public static extractHostnames(content: string): string[] {
    const hostnames = new Set<string>();
    const matches = content.match(this.URL_REGEX);
    if (!matches) return [];

    for (const match of matches) {
      const hostname = this.normalizeHostname(match);
      if (hostname && hostname.includes('.')) {
        hostnames.add(hostname);
      }
    }

    return Array.from(hostnames);
  }

  /**
   * Evaluates if a message contains unauthorized external links
   */
  public static checkExternalLinks(
    content: string,
    settings: GuildProtectionSettings
  ): DetectionResult {
    if (!settings.externalLinkFilterEnabled) {
      return { violated: false };
    }

    const hostnames = this.extractHostnames(content);
    if (hostnames.length === 0) {
      return { violated: false };
    }

    // 1. Check Explicit Blocklist
    if (settings.blockedDomains.length > 0) {
      for (const host of hostnames) {
        for (const blocked of settings.blockedDomains) {
          if (this.isDomainMatch(host, blocked)) {
            return {
              violated: true,
              protectionType: ProtectionType.EXTERNAL_LINK,
              reason: `Posted prohibited domain link (${host})`,
              punishment: settings.externalLinkPunishment,
              deleteMessage: settings.deleteViolatingMessages,
              metadata: { blockedDomain: host },
            };
          }
        }
      }
    }

    // 2. Check Allowlist (if allowlist configured, non-matching domains are violations)
    if (settings.allowedDomains.length > 0) {
      for (const host of hostnames) {
        const isAllowed = settings.allowedDomains.some((allowed) =>
          this.isDomainMatch(host, allowed)
        );

        if (!isAllowed) {
          return {
            violated: true,
            protectionType: ProtectionType.EXTERNAL_LINK,
            reason: `Posted unapproved external domain link (${host})`,
            punishment: settings.externalLinkPunishment,
            deleteMessage: settings.deleteViolatingMessages,
            metadata: { unapprovedDomain: host },
          };
        }
      }
    }

    return { violated: false };
  }
}
