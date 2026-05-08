import type { TriggerAction, TriggerCondition, TriggerConditionOperator, TriggerGroup } from './TriggerGroups';

export type EventCatalogCategory =
  | 'Movement'
  | 'Capture'
  | 'Check'
  | 'Game'
  | 'Timer'
  | 'Interface'
  | 'Custom';

export type EventConditionInput = 'piece' | 'side' | 'square' | 'text' | 'select';

export interface EventConditionTemplate {
  field: string;
  label: string;
  input: EventConditionInput;
  defaultOperator?: TriggerConditionOperator;
  defaultValue?: unknown;
  options?: Array<{ value: string; label: string; icon?: string }>;
}

export interface EventCatalogEntry {
  id: string;
  event: string;
  label: string;
  sentence: string;
  category: EventCatalogCategory;
  icon: string;
  description: string;
  keywords: string[];
  common?: boolean;
  conditions: EventConditionTemplate[];
}

export interface TriggerActionTemplate {
  type: string;
  label: string;
  icon: string;
  defaultKey: string;
  defaultLabel: string;
  previewable: boolean;
  keywords: string[];
}

export const PIECE_OPTIONS = [
  { value: 'any', label: 'Any piece', icon: '♟' },
  { value: 'pawn', label: 'Pawn', icon: '♙' },
  { value: 'knight', label: 'Knight', icon: '♘' },
  { value: 'bishop', label: 'Bishop', icon: '♗' },
  { value: 'rook', label: 'Rook', icon: '♖' },
  { value: 'queen', label: 'Queen', icon: '♕' },
  { value: 'king', label: 'King', icon: '♔' },
];

export const SIDE_OPTIONS = [
  { value: 'any', label: 'Any side' },
  { value: 'w', label: 'White' },
  { value: 'b', label: 'Black' },
];

export const BOARD_RESULT_OPTIONS = [
  { value: 'check', label: 'Puts king in check', icon: '👑' },
  { value: 'checkmate', label: 'Checkmate', icon: '🏁' },
  { value: 'capture', label: 'Captures a piece', icon: '⚔️' },
  { value: 'promotion', label: 'Promotes', icon: '♛' },
];

export const EVENT_CATALOG: EventCatalogEntry[] = [
  {
    id: 'piece-moves',
    event: 'move.made',
    label: 'Piece moves',
    sentence: 'moves',
    category: 'Movement',
    icon: '♟',
    description: 'A piece moves from one square to another.',
    keywords: ['move', 'piece', 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king', 'square'],
    common: true,
    conditions: [
      { field: 'piece', label: 'Piece', input: 'piece', defaultValue: 'any' },
      { field: 'side', label: 'Side', input: 'side', defaultValue: 'any' },
      { field: 'to', label: 'Moves to square', input: 'square', defaultValue: '' },
    ],
  },
  {
    id: 'piece-captures',
    event: 'move.capture',
    label: 'Piece captures',
    sentence: 'captures',
    category: 'Capture',
    icon: '⚔️',
    description: 'A move captures another piece.',
    keywords: ['capture', 'takes', 'piece', 'attack'],
    common: true,
    conditions: [
      { field: 'piece', label: 'Attacking piece', input: 'piece', defaultValue: 'any' },
      { field: 'target', label: 'Captured piece', input: 'piece', defaultValue: 'any' },
      { field: 'side', label: 'Side', input: 'side', defaultValue: 'any' },
    ],
  },
  {
    id: 'king-checked',
    event: 'check',
    label: 'King is checked',
    sentence: 'puts a king in check',
    category: 'Check',
    icon: '👑',
    description: 'A move creates check against a king.',
    keywords: ['check', 'king', 'danger', 'attack', 'queen', 'rook', 'bishop', 'knight', 'pawn'],
    common: true,
    conditions: [
      { field: 'piece', label: 'Checking piece', input: 'piece', defaultValue: 'any' },
      { field: 'side', label: 'Checking side', input: 'side', defaultValue: 'any' },
      { field: 'target', label: 'Target king', input: 'piece', defaultValue: 'king' },
    ],
  },
  {
    id: 'checkmate',
    event: 'checkmate',
    label: 'Checkmate',
    sentence: 'delivers checkmate',
    category: 'Game',
    icon: '🏁',
    description: 'The game ends by checkmate.',
    keywords: ['mate', 'checkmate', 'win', 'game over'],
    common: true,
    conditions: [
      { field: 'side', label: 'Winning side', input: 'side', defaultValue: 'any' },
    ],
  },
  {
    id: 'pawn-promotion',
    event: 'promotion',
    label: 'Pawn promotes',
    sentence: 'promotes',
    category: 'Movement',
    icon: '♛',
    description: 'A pawn reaches promotion and becomes another piece.',
    keywords: ['promotion', 'pawn', 'queen', 'last rank'],
    common: true,
    conditions: [
      { field: 'piece', label: 'Piece', input: 'piece', defaultValue: 'pawn' },
      { field: 'side', label: 'Side', input: 'side', defaultValue: 'any' },
      { field: 'promotion', label: 'Promotes to', input: 'piece', defaultValue: 'queen' },
    ],
  },
  {
    id: 'timer-low',
    event: 'timer.low',
    label: 'Timer gets low',
    sentence: 'timer gets low',
    category: 'Timer',
    icon: '⏱',
    description: 'A player clock reaches a low-time threshold.',
    keywords: ['timer', 'clock', 'time', 'low'],
    conditions: [
      { field: 'side', label: 'Side', input: 'side', defaultValue: 'any' },
      { field: 'seconds', label: 'Seconds left', input: 'text', defaultValue: '10' },
    ],
  },
  {
    id: 'panel-opened',
    event: 'panel.opened',
    label: 'Panel opens',
    sentence: 'opens a panel',
    category: 'Interface',
    icon: '🪟',
    description: 'A workspace panel or tool is opened.',
    keywords: ['panel', 'window', 'ui', 'tool', 'opened'],
    conditions: [
      { field: 'panelViewId', label: 'Panel', input: 'text', defaultValue: '' },
    ],
  },
  {
    id: 'custom-event',
    event: 'custom.event',
    label: 'Custom event',
    sentence: 'custom event happens',
    category: 'Custom',
    icon: '✨',
    description: 'A package or advanced custom event fires.',
    keywords: ['custom', 'package', 'advanced', 'event'],
    conditions: [
      { field: 'eventId', label: 'Custom event ID', input: 'text', defaultValue: '' },
    ],
  },
];

export const ACTION_TEMPLATES: TriggerActionTemplate[] = [
  { type: 'audio', label: 'Sound', icon: '🔊', defaultKey: '', defaultLabel: 'Choose sound', previewable: true, keywords: ['sound', 'audio', 'music', 'mp3', 'wav'] },
  { type: 'animation', label: 'Animation', icon: '✨', defaultKey: '', defaultLabel: 'Choose animation', previewable: true, keywords: ['animation', 'flash', 'glow', 'move', 'effect'] },
  { type: 'message', label: 'Message', icon: '💬', defaultKey: 'message', defaultLabel: 'Show message', previewable: false, keywords: ['message', 'text', 'popup'] },
  { type: 'ui', label: 'UI Effect', icon: '🎨', defaultKey: 'effect', defaultLabel: 'Run UI effect', previewable: true, keywords: ['ui', 'board', 'glow', 'highlight'] },
];

export const makeTriggerId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

export const makeCatalogCondition = (template: EventConditionTemplate): TriggerCondition => ({
  id: makeTriggerId('condition'),
  label: template.label,
  field: template.field,
  operator: template.defaultOperator ?? 'equals',
  value: template.defaultValue,
});

export const makeCatalogAction = (template: TriggerActionTemplate): TriggerAction => ({
  id: makeTriggerId('action'),
  type: template.type,
  key: template.defaultKey,
  label: template.defaultLabel,
  enabled: true,
  previewable: template.previewable,
});

export const makeGroupFromCatalogEntry = (entry: EventCatalogEntry): TriggerGroup => ({
  id: makeTriggerId('trigger-group'),
  enabled: false,
  trigger: {
    event: entry.event,
    conditionMode: 'all',
    conditions: entry.conditions.map(makeCatalogCondition),
  },
  actions: [makeCatalogAction(ACTION_TEMPLATES[0])],
  metadata: {
    name: entry.label,
    category: entry.category,
    tags: [],
    icon: entry.icon,
    keywords: entry.keywords,
    source: 'user',
  },
});

export const getCatalogEntryForEvent = (event: string) => EVENT_CATALOG.find(entry => entry.event === event);

export const searchEventCatalog = (query: string, category = 'All') => {
  const term = query.trim().toLowerCase();
  return EVENT_CATALOG.filter(entry => {
    if (category !== 'All' && entry.category !== category) return false;
    if (!term) return true;
    return [entry.label, entry.event, entry.description, entry.sentence, entry.category, ...entry.keywords]
      .join(' ')
      .toLowerCase()
      .includes(term);
  });
};

export const describeConditionValue = (condition: TriggerCondition) => {
  const piece = PIECE_OPTIONS.find(option => option.value === condition.value);
  if (piece) return `${piece.icon} ${piece.label}`;
  const side = SIDE_OPTIONS.find(option => option.value === condition.value);
  if (side) return side.label;
  return String(condition.value ?? 'anything');
};

export const getReadableTriggerText = (group: TriggerGroup) => {
  const entry = getCatalogEntryForEvent(group.trigger.event);
  const conditions = group.trigger.conditions ?? [];
  const mainPiece = conditions.find(condition => condition.field === 'piece');
  const pieceText = mainPiece ? describeConditionValue(mainPiece) : 'Something';
  const conditionText = conditions
    .filter(condition => condition.field !== 'piece' && condition.value !== '' && condition.value !== undefined)
    .map(condition => `${condition.label.toLowerCase()} is ${describeConditionValue(condition)}`);
  const actionText = group.actions.filter(action => action.enabled !== false).map(action => action.label || action.key || action.type).join(', ') || 'do nothing yet';
  const joiner = group.trigger.conditionMode === 'any' ? ' or ' : ' and ';
  return `If ${pieceText} ${entry?.sentence ?? group.trigger.event}${conditionText.length ? ` and ${conditionText.join(joiner)}` : ''}, then ${actionText}.`;
};

export const findMatchingTriggerGroups = (groups: TriggerGroup[], draft: TriggerGroup) => groups.filter(group => {
  if (group.id === draft.id) return false;
  if (group.trigger.event !== draft.trigger.event) return false;
  return JSON.stringify(group.trigger.conditions ?? []) === JSON.stringify(draft.trigger.conditions ?? []);
});
