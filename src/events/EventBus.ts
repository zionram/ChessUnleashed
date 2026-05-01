import type { GameEvent, GameEventHandler } from './types';

class EventBus {
  private handlers: Map<string, GameEventHandler[]> = new Map();

  public subscribe(type: string, handler: GameEventHandler): void {
    const list = this.handlers.get(type) || [];
    this.handlers.set(type, [...list, handler]);
  }

  public unsubscribe(type: string, handler: GameEventHandler): void {
    const list = this.handlers.get(type) || [];
    this.handlers.set(type, list.filter(h => h !== handler));
  }

  public emit(event: Omit<GameEvent, 'timestamp'>): void {
    const fullEvent: GameEvent = {
      ...event,
      timestamp: Date.now()
    };

    // Specific handlers
    const handlers = this.handlers.get(fullEvent.type) || [];
    handlers.forEach(h => h(fullEvent));

    // Wildcard handlers
    const wildcards = this.handlers.get('*') || [];
    wildcards.forEach(h => h(fullEvent));
  }
}

export const eventBus = new EventBus();
