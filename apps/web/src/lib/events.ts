type EventListener = (data: any) => void;

class RealtimeEventEmitter {
  private listeners: Map<string, Set<EventListener>> = new Map();

  subscribe(guildId: string, listener: EventListener) {
    if (!this.listeners.has(guildId)) {
      this.listeners.set(guildId, new Set());
    }
    this.listeners.get(guildId)?.add(listener);

    return () => {
      this.listeners.get(guildId)?.delete(listener);
    };
  }

  emit(guildId: string, event: string, payload: any) {
    const guildListeners = this.listeners.get(guildId);
    if (guildListeners) {
      guildListeners.forEach((fn) => fn({ event, payload, timestamp: new Date().toISOString() }));
    }
  }
}

export const realtimeBus = new RealtimeEventEmitter();
