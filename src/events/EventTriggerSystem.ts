import { eventBus } from './EventBus';
import type { GameEvent } from './types';
import { doesTriggerGroupMatch, legacyTriggerToGroup, type LegacyTriggerDefinition } from './TriggerGroups';

export type TriggerDefinition = LegacyTriggerDefinition;

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
    const matches = triggers
      .map((trigger, index) => legacyTriggerToGroup(trigger, index))
      .filter(group => doesTriggerGroupMatch(group, event));

    for (const trigger of matches) {
      for (const normalizedAction of trigger.actions.filter(action => action.enabled !== false)) {
        const { type, key } = normalizedAction;
        
        if (type === "audio") {
          if (this.onAudioTrigger) {
            const volume = typeof normalizedAction.volume === "number" ? normalizedAction.volume : undefined;
            this.onAudioTrigger(key, event.payload, { volume });
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
