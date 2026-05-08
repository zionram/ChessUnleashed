import type { GameEvent } from './types';

export type TriggerConditionMode = 'all' | 'any';

export type TriggerConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'includes'
  | 'exists'
  | 'notExists';

export interface TriggerCondition {
  id: string;
  label: string;
  field: string;
  operator: TriggerConditionOperator;
  value?: unknown;
}

export interface TriggerAction {
  id: string;
  type: string;
  key: string;
  enabled?: boolean;
  label?: string;
  previewable?: boolean;
  [key: string]: unknown;
}

export interface TriggerGroupMetadata {
  name?: string;
  summary?: string;
  category?: string;
  tags?: string[];
  icon?: string;
  keywords?: string[];
  favorite?: boolean;
  source?: 'legacy-trigger' | 'custom-event' | 'audio-rule' | 'animation-rule' | 'user';
}

export interface TriggerGroup {
  id: string;
  enabled: boolean;
  trigger: {
    event: string;
    conditionMode?: TriggerConditionMode;
    conditions?: TriggerCondition[];
  };
  actions: TriggerAction[];
  metadata?: TriggerGroupMetadata;
}

export interface LegacyTriggerDefinition {
  event: string;
  actions: (string | { type: string; key: string; [key: string]: unknown })[];
  enabled?: boolean;
}

export const normalizeLegacyAction = (
  action: LegacyTriggerDefinition['actions'][number],
  index = 0,
): TriggerAction => {
  if (typeof action === 'string') {
    const [type = 'unknown', key = action] = action.split('.');
    return {
      id: `${type}-${key}-${index}`,
      type,
      key,
      enabled: true,
      label: `${type}.${key}`,
    };
  }

  const { type, key, enabled, ...rest } = action;
  return {
    id: `${type}-${key}-${index}`,
    type,
    key,
    enabled: enabled !== false,
    label: `${type}.${key}`,
    ...rest,
  };
};

export const legacyTriggerToGroup = (
  trigger: LegacyTriggerDefinition,
  index = 0,
): TriggerGroup => ({
  id: `legacy-${trigger.event}-${index}`,
  enabled: trigger.enabled !== false,
  trigger: {
    event: trigger.event,
    conditionMode: 'all',
    conditions: [],
  },
  actions: trigger.actions.map((action, actionIndex) => normalizeLegacyAction(action, actionIndex)),
  metadata: {
    name: trigger.event,
    summary: `When ${trigger.event} happens`,
    category: 'Legacy Triggers',
    keywords: [trigger.event],
    source: 'legacy-trigger',
  },
});

export const getEventPayloadValue = (event: GameEvent, field: string): unknown => {
  if (!field || field === 'type') return event.type;
  if (field === 'timestamp') return event.timestamp;

  const payload = event.payload as Record<string, unknown> | undefined;
  if (!payload) return undefined;

  return field.split('.').reduce<unknown>((current, segment) => {
    if (current && typeof current === 'object' && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }
    return undefined;
  }, payload);
};

export const doesConditionMatch = (condition: TriggerCondition, event: GameEvent): boolean => {
  const actual = getEventPayloadValue(event, condition.field);

  switch (condition.operator) {
    case 'equals':
      return actual === condition.value;
    case 'notEquals':
      return actual !== condition.value;
    case 'includes':
      return Array.isArray(actual) ? actual.includes(condition.value) : String(actual ?? '').includes(String(condition.value ?? ''));
    case 'exists':
      return actual !== undefined && actual !== null && actual !== '';
    case 'notExists':
      return actual === undefined || actual === null || actual === '';
    default:
      return false;
  }
};

export const doesTriggerGroupMatch = (group: TriggerGroup, event: GameEvent): boolean => {
  if (!group.enabled || group.trigger.event !== event.type) return false;
  const conditions = group.trigger.conditions ?? [];
  if (!conditions.length) return true;
  const mode = group.trigger.conditionMode ?? 'all';
  return mode === 'any'
    ? conditions.some(condition => doesConditionMatch(condition, event))
    : conditions.every(condition => doesConditionMatch(condition, event));
};

export const summarizeTriggerGroup = (group: TriggerGroup): string => {
  if (group.metadata?.summary?.trim()) return group.metadata.summary;
  const conditions = group.trigger.conditions ?? [];
  const conditionText = conditions.length
    ? conditions.map(condition => `${condition.label || condition.field} ${condition.operator} ${String(condition.value ?? '')}`.trim()).join(group.trigger.conditionMode === 'any' ? ' OR ' : ' AND ')
    : 'no extra conditions';
  const actions = group.actions.filter(action => action.enabled !== false).map(action => action.label || `${action.type}.${action.key}`).join(', ') || 'no actions';
  return `If ${group.trigger.event} happens with ${conditionText}, then ${actions}.`;
};
