/**
 * Resolves the base URL for the SMCore Bot HTTP Bridge / Health service.
 * In production (e.g. Render / Vercel), this is configured via BOT_API_URL.
 * Falls back to localhost:${BOT_PORT || 3001} for local development.
 */
export function getBotApiUrl(): string {
  const customUrl = process.env.BOT_API_URL || process.env.NEXT_PUBLIC_BOT_API_URL;
  if (customUrl && customUrl.trim()) {
    return customUrl.trim().replace(/\/+$/, '');
  }

  const botPort = process.env.BOT_PORT || '3001';
  return `http://localhost:${botPort}`;
}
