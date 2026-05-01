import type { CustomEventDefinition } from '../context/SettingsContext';
import type { GameEvent } from './types';

export interface CustomEventMatchResult {
  matched: boolean;
  reason: string;
  missingData: string[];
  unsupported: string[];
}

export const TACTICAL_CONDITION_STATUS: Record<string, string> = {
  pieceAttacked: 'Active: detects legal capture targets exposed after a move.',
  fork: 'Active: detects a moved piece attacking two or more valuable enemy pieces.',
  pin: 'Future detection: needs king-line and blocker analysis.',
  trappedPiece: 'Future detection: needs legal escape analysis.',
  noSafeMove: 'Future detection: needs full legal move safety checks.'
};

export const TACTICAL_EVENT_DESCRIPTIONS: Record<string, string> = {
  pieceAttacked: 'Fires when the moved piece now has a legal capture on a matching target piece.',
  fork: 'Fires when the moved piece attacks at least two valuable enemy pieces. Valuable means king, queen, or rook in this first pass.',
  pin: 'Future: detects a piece pinned to a king or critical target.',
  trappedPiece: 'Future: detects a threatened piece with no useful escape.',
  noSafeMove: 'Future: detects positions where a side has no safe move.'
};

export const getTacticalTestHint = (definition: CustomEventDefinition) => {
  switch (definition.conditions.complexCondition) {
    case 'pieceAttacked':
      return 'Test by making a move that creates a legal capture against the selected target piece.';
    case 'fork':
      return 'Test by creating a position where one move attacks two valuable pieces, such as king and queen.';
    case 'pin':
    case 'trappedPiece':
    case 'noSafeMove':
      return 'This is saved as a future tactical design, but runtime detection is not active yet.';
    default:
      return 'Test with a matching sample payload or by performing the base trigger in-game.';
  }
};

export const getCustomEventStatus = (
  definition: CustomEventDefinition,
  existing: CustomEventDefinition[] = []
) => {
  if (!definition.name.trim() || !definition.eventId.trim() || !definition.baseTrigger) return 'Invalid';
  if (definition.conditions.complexCondition && !['pieceAttacked', 'fork'].includes(definition.conditions.complexCondition)) return 'Future-only';
  if (existing.some(item => item.id !== definition.id && item.eventId.trim() === definition.eventId.trim())) return 'Invalid';
  return 'Active';
};

export const getTacticalReadinessNote = (definition: CustomEventDefinition) => {
  const condition = definition.conditions.complexCondition;
  return condition
    ? `${TACTICAL_CONDITION_STATUS[condition] ?? 'Future tactical detection.'} ${TACTICAL_EVENT_DESCRIPTIONS[condition] ?? ''}`.trim()
    : 'Simple runtime detection supported.';
};

export const getCustomEventLogDetails = (definition: CustomEventDefinition, event: GameEvent) => {
  const payload = normalizePayload(event);
  return {
    movedPiece: payload.pieceType,
    team: payload.team,
    from: payload.fromSquare,
    to: payload.toSquare,
    attackedTargets: payload.attackedPieces ?? [],
    forkTargets: payload.forkTargets ?? [],
    sourceEvent: event.type,
    tacticalCondition: definition.conditions.complexCondition || null
  };
};

type NormalizedPayload = {
  sourceType: string;
  pieceType?: string;
  team?: string;
  fromSquare?: string;
  toSquare?: string;
  capturedPiece?: string;
  attackedPieces?: string[];
  forkTargets?: string[];
  isSimpleFork?: boolean;
  panelViewId?: string;
  isPromotion?: boolean;
  isCheck?: boolean;
  isCheckmate?: boolean;
};

const isUnset = (value?: string) => !value || value === 'any';

const getString = (payload: any, keys: string[]) => {
  for (const key of keys) {
    const value = payload?.[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return undefined;
};

const getPieceType = (payload: any) =>
  getString(payload, ['pieceType', 'piece', 'type']) ?? getString(payload?.move, ['piece', 'type']);

const getTeam = (payload: any) =>
  getString(payload, ['team', 'side', 'color']) ?? getString(payload?.move, ['color']);

const getCapturedPiece = (payload: any) =>
  getString(payload, ['capturedPiece', 'captured']) ?? getString(payload?.move, ['captured']);

const normalizePayload = (event: GameEvent): NormalizedPayload => {
  const payload = event.payload as any;
  const attackedPieces = Array.isArray(payload?.attackedPieces)
    ? payload.attackedPieces.filter((item: unknown): item is string => typeof item === 'string')
    : [];
  const forkTargets = Array.isArray(payload?.forkTargets)
    ? payload.forkTargets.filter((item: unknown): item is string => typeof item === 'string')
    : [];
  return {
    sourceType: event.type,
    pieceType: getPieceType(payload),
    team: getTeam(payload),
    fromSquare: getString(payload, ['from', 'fromSquare']) ?? getString(payload?.move, ['from']),
    toSquare: getString(payload, ['to', 'toSquare']) ?? getString(payload?.move, ['to']),
    capturedPiece: getCapturedPiece(payload),
    attackedPieces,
    forkTargets,
    isSimpleFork: Boolean(payload?.isSimpleFork || forkTargets.length >= 2),
    panelViewId: getString(payload, ['panelViewId', 'viewId']),
    isPromotion: Boolean(payload?.isPromotion ?? payload?.move?.promotion ?? payload?.flags?.includes?.('p')),
    isCheck: Boolean(payload?.isCheck),
    isCheckmate: Boolean(payload?.isCheckmate)
  };
};

const eventMatchesBaseTrigger = (definition: CustomEventDefinition, event: GameEvent, payload: NormalizedPayload) => {
  switch (definition.baseTrigger) {
    case 'afterMove':
    case 'pieceMoved':
      return event.type === 'move.made';
    case 'pieceCaptured':
      return event.type === 'piece.captured' || (event.type === 'move.made' && !!payload.capturedPiece);
    case 'promotion':
      return event.type === 'move.made' && payload.isPromotion;
    case 'check':
      return event.type === 'move.made' && payload.isCheck;
    case 'checkmate':
      return event.type === 'move.made' && payload.isCheckmate;
    case 'gameStart':
      return event.type === 'game.start';
    case 'gameEnd':
      return event.type === 'game.end';
    case 'panelOpened':
      return event.type === 'panel.opened';
    default:
      return false;
  }
};

const compareCondition = (
  label: string,
  expected: string | undefined,
  actual: string | undefined,
  missingData: string[]
) => {
  if (isUnset(expected)) return true;
  if (!actual) {
    missingData.push(label);
    return false;
  }
  const normalizedExpected = expected?.toLowerCase();
  const normalizedActual = actual.toLowerCase();
  if (normalizedExpected === normalizedActual) return true;
  if (label === 'team') {
    return (normalizedExpected === 'white' && normalizedActual === 'w') ||
      (normalizedExpected === 'black' && normalizedActual === 'b');
  }
  if (label === 'captured piece' || label === 'piece type') {
    const aliases: Record<string, string> = {
      pawn: 'p',
      knight: 'n',
      bishop: 'b',
      rook: 'r',
      queen: 'q',
      king: 'k'
    };
    return aliases[normalizedExpected ?? ''] === normalizedActual || aliases[normalizedActual] === normalizedExpected;
  }
  return false;
};

const pieceMatches = (actual: string, expected?: string) =>
  compareCondition('captured piece', expected, actual, []);

export const evaluateCustomEventDefinition = (
  definition: CustomEventDefinition,
  event: GameEvent
): CustomEventMatchResult => {
  const unsupported: string[] = [];
  const missingData: string[] = [];
  if (definition.conditions.complexCondition && !['pieceAttacked', 'fork'].includes(definition.conditions.complexCondition)) {
    unsupported.push(`${definition.conditions.complexCondition} detection is coming later.`);
  }
  if (unsupported.length) {
    return { matched: false, reason: 'This event uses unsupported future-only tactical conditions.', missingData, unsupported };
  }

  const payload = normalizePayload(event);
  if (definition.conditions.complexCondition === 'pieceAttacked') {
    if (event.type !== 'move.made') {
      return { matched: false, reason: `Source event ${event.type} does not include attack data.`, missingData, unsupported };
    }
    const expectedTarget = definition.conditions.capturedPiece;
    const attackedPieces = payload.attackedPieces ?? [];
    if (!attackedPieces.length) return { matched: false, reason: 'No attacked pieces were detected after this move.', missingData, unsupported };
    if (!isUnset(expectedTarget) && !attackedPieces.some(piece => pieceMatches(piece, expectedTarget))) {
      return { matched: false, reason: `No attacked ${expectedTarget} was detected.`, missingData, unsupported };
    }
  }
  if (definition.conditions.complexCondition === 'fork') {
    if (event.type !== 'move.made') {
      return { matched: false, reason: `Source event ${event.type} does not include fork data.`, missingData, unsupported };
    }
    if (!payload.isSimpleFork) return { matched: false, reason: 'No simple fork was detected after this move.', missingData, unsupported };
  }
  if (!eventMatchesBaseTrigger(definition, event, payload)) {
    return { matched: false, reason: `Source event ${event.type} does not match ${definition.baseTrigger || 'unset trigger'}.`, missingData, unsupported };
  }

  const conditions = definition.conditions;
  const conditionChecks = [
    compareCondition('piece type', conditions.pieceType, payload.pieceType, missingData),
    compareCondition('team', conditions.team, payload.team, missingData),
    compareCondition('from square', conditions.fromSquare, payload.fromSquare, missingData),
    compareCondition('to square', conditions.toSquare, payload.toSquare, missingData),
    definition.conditions.complexCondition === 'pieceAttacked'
      ? true
      : compareCondition('captured piece', conditions.capturedPiece, payload.capturedPiece, missingData),
    compareCondition('panel/view id', conditions.panelViewId, payload.panelViewId, missingData)
  ];
  const conditionMode = definition.conditionMode ?? 'all';
  const meaningfulConditionCount = [
    conditions.pieceType,
    conditions.team,
    conditions.fromSquare,
    conditions.toSquare,
    conditions.capturedPiece,
    conditions.panelViewId
  ].filter(value => !isUnset(value)).length;
  const matches = conditionMode === 'any' && meaningfulConditionCount > 0
    ? conditionChecks.some(Boolean)
    : conditionChecks.every(Boolean);

  if (!matches) {
    return {
      matched: false,
      reason: missingData.length ? 'Runtime event is missing data needed by this definition.' : 'Runtime event did not satisfy the selected conditions.',
      missingData,
      unsupported
    };
  }

  return { matched: true, reason: 'Custom event matched.', missingData, unsupported };
};

export const getCustomEventAudioContext = (event: GameEvent) => {
  const payload = normalizePayload(event);
  return {
    piece: payload.pieceType,
    side: payload.team,
    mode: 'any'
  };
};

export const createSimulatedGameEvent = (definition: CustomEventDefinition): GameEvent => {
  const conditions = definition.conditions;
  const basePayload = {
    pieceType: isUnset(conditions.pieceType) ? 'pawn' : conditions.pieceType,
    team: isUnset(conditions.team) ? 'w' : conditions.team,
    from: conditions.fromSquare || 'e2',
    to: conditions.toSquare || 'e4',
    capturedPiece: isUnset(conditions.capturedPiece) ? undefined : conditions.capturedPiece,
    attackedPieces: definition.conditions.complexCondition === 'pieceAttacked'
      ? [isUnset(conditions.capturedPiece) ? 'queen' : conditions.capturedPiece]
      : definition.conditions.complexCondition === 'fork'
        ? ['king', 'queen']
        : [],
    forkTargets: definition.conditions.complexCondition === 'fork' ? ['king', 'queen'] : [],
    isSimpleFork: definition.conditions.complexCondition === 'fork',
    panelViewId: conditions.panelViewId || 'sound-editor',
    isPromotion: definition.baseTrigger === 'promotion',
    isCheck: definition.baseTrigger === 'check',
    isCheckmate: definition.baseTrigger === 'checkmate'
  };

  const type = definition.baseTrigger === 'pieceCaptured'
    ? 'piece.captured'
    : definition.baseTrigger === 'gameStart'
      ? 'game.start'
      : definition.baseTrigger === 'gameEnd'
        ? 'game.end'
        : definition.baseTrigger === 'panelOpened'
          ? 'panel.opened'
          : 'move.made';

  return { type, payload: basePayload, timestamp: Date.now() };
};
