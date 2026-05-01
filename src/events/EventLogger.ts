import { eventBus } from './EventBus';
import type { GameEvent } from './types';

export class EventLogger {
  private events: GameEvent[] = [];
  private handler = (event: GameEvent) => this.events.push(event);

  constructor() {
    eventBus.subscribe('*', this.handler);
  }

  public getEvents(): GameEvent[] {
    return [...this.events];
  }

  public clear(): void {
    this.events = [];
  }

  public dispose(): void {
    eventBus.unsubscribe('*', this.handler);
  }
}

export const eventLogger = new EventLogger();
