import { eventBus } from './EventBus';
import type { GameEvent } from './types';

export interface TriggerDefinition {
  event: string;
  actions: (string | { type: string; key: string; [key: string]: any })[];
  enabled?: boolean;
}

const triggers: TriggerDefinition[] = [
  { 
    event: "move.made", 
    actions: [{ type: "audio", key: "move", volume: 0.5 }],
    enabled: true 
  },
  { 
    event: "piece.captured", 
    actions: ["audio.capture"],
    enabled: true
  }
];

class EventTriggerSystem {
  private onAudioTrigger?: (eventName: string, payload?: any, options?: { volume?: number }) => void;

  constructor() {
    eventBus.subscribe('*', (event) => this.handleEvent(event));
  }

  public setAudioHandler(handler: (eventName: string, payload?: any, options?: { volume?: number }) => void) {
    this.onAudioTrigger = handler;
  }

  private handleEvent(event: GameEvent) {
    const matches = triggers.filter(t => t.event === event.type && t.enabled !== false);
    
    for (const trigger of matches) {
      for (const action of trigger.actions) {
        const normalizedAction = typeof action === "string" 
          ? { type: action.split('.')[0], key: action.split('.')[1] }
          : action;
        
        const { type, key } = normalizedAction;
        
        if (type === "audio") {
          if (this.onAudioTrigger) {
            this.onAudioTrigger(key, event.payload, { volume: normalizedAction.volume });
          }
        } else {
          // TODO: future action types
          console.log(`[EventTrigger] TODO: ${type}.${key}`, event.payload);
        }
      }
    }
  }
}

export const eventTriggerSystem = new EventTriggerSystem();
