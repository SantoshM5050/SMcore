class MemoryCache {
  private cache = new Map<string, { value: string; expiresAt: number }>();

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: string, ttlSeconds = 300): void {
    this.cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  del(key: string): void {
    this.cache.delete(key);
  }
}

const cacheStore = new MemoryCache();

export class CacheService {
  static async getJSON<T>(key: string): Promise<T | null> {
    try {
      const data = cacheStore.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static async setJSON(key: string, value: any, ttlSeconds = 300): Promise<void> {
    try {
      cacheStore.set(key, JSON.stringify(value), ttlSeconds);
    } catch {
      // ignore cache write failures
    }
  }

  static async invalidate(key: string): Promise<void> {
    cacheStore.del(key);
  }
}
