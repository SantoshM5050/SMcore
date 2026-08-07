const rateMap = new Map<string, { count: number; expiresAt: number }>();

export function checkRateLimit(ipOrUserId: string, limit = 60, windowSeconds = 60): boolean {
  const now = Date.now();
  const entry = rateMap.get(ipOrUserId);

  if (!entry || entry.expiresAt < now) {
    rateMap.set(ipOrUserId, { count: 1, expiresAt: now + windowSeconds * 1000 });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}
