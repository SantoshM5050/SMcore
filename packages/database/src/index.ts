import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var globalPrisma: PrismaClient | undefined;
}

function getPrismaInstance(): PrismaClient {
  if (!globalThis.globalPrisma) {
    try {
      globalThis.globalPrisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      });
    } catch (err: any) {
      console.error('⚠️ Failed to initialize PrismaClient:', err.message || err);
    }
  }
  return globalThis.globalPrisma!;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const instance = getPrismaInstance();
    if (!instance) return undefined;
    const value = Reflect.get(instance, prop, instance);
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});

export * from '@prisma/client';

