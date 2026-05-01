export type RulesetStatus = 'draft' | 'validated' | 'tested' | 'approved';
export type MovementType = 'step' | 'ray' | 'jump';
export type CaptureBehavior = 'move-only' | 'capture-only' | 'move-and-capture';
export type CaptureMethod = 'normal' | 'jump';
export type PromotionCondition = 'team-relative-last-row';
export type WinConditionType = 'eliminate-opponent-pieces' | 'opponent-no-legal-moves' | 'capture-target-piece' | 'custom';

export interface RuleTeam {
  id: string;
  name: string;
}

export interface RulePieceDefinition {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  teamAvailability: string[];
  movementRules: MovementRule[];
}

export interface MovementRule {
  id: string;
  type: MovementType;
  directions: string;
  offsets: string;
  maxDistance: number;
  captureBehavior: CaptureBehavior;
  captureMethod: CaptureMethod;
  captureRequired: boolean;
  landingSquareRequired: boolean;
  capturedPieceOffset: string;
}

export interface PromotionRule {
  id: string;
  sourcePieceId: string;
  targetPieceId: string;
  condition: PromotionCondition;
  zoneDescription: string;
}

export interface WinCondition {
  id: string;
  type: WinConditionType;
  targetPieceId: string;
  description: string;
}

export interface StartingPosition {
  id: string;
  teamId: string;
  pieceId: string;
  row: number;
  col: number;
}

export interface TurnOrder {
  teamIds: string[];
}

export interface CustomRuleset {
  id: string;
  type: 'custom';
  name: string;
  description: string;
  boardWidth: number;
  boardHeight: number;
  teams: RuleTeam[];
  pieces: RulePieceDefinition[];
  promotionRules: PromotionRule[];
  winConditions: WinCondition[];
  startingSetup: StartingPosition[];
  turnOrder: TurnOrder;
  forcedCaptures: boolean;
  multiJump: boolean;
  status: RulesetStatus;
  sourceRulesetId?: string;
}

export interface BuiltInRuleset {
  id: 'standard-chess';
  type: 'standard';
  name: string;
  description: string;
  boardWidth: number;
  boardHeight: number;
  teams: RuleTeam[];
  pieces: RulePieceDefinition[];
  promotionRules: PromotionRule[];
  winConditions: WinCondition[];
  startingSetup: StartingPosition[];
  turnOrder: TurnOrder;
  forcedCaptures: boolean;
  multiJump: boolean;
  locked: true;
}

const normalCaptureMetadata = {
  captureMethod: 'normal' as CaptureMethod,
  captureRequired: false,
  landingSquareRequired: false,
  capturedPieceOffset: ''
};

export const STANDARD_CHESS_RULESET: BuiltInRuleset = {
  id: 'standard-chess',
  type: 'standard',
  name: 'Standard Chess',
  description: 'The built-in chess ruleset. This ruleset is locked and cannot be edited.',
  boardWidth: 8,
  boardHeight: 8,
  forcedCaptures: false,
  multiJump: false,
  teams: [
    { id: 'white', name: 'White' },
    { id: 'black', name: 'Black' }
  ],
  pieces: [
    { id: 'king', name: 'king', displayName: 'King', description: 'Locked Standard Chess king metadata.', teamAvailability: ['white', 'black'], movementRules: [{ id: 'king-step', type: 'step', directions: 'all directions', offsets: '', maxDistance: 1, captureBehavior: 'move-and-capture', ...normalCaptureMetadata }] },
    { id: 'queen', name: 'queen', displayName: 'Queen', description: 'Locked Standard Chess queen metadata.', teamAvailability: ['white', 'black'], movementRules: [{ id: 'queen-ray', type: 'ray', directions: 'orthogonal and diagonal', offsets: '', maxDistance: 8, captureBehavior: 'move-and-capture', ...normalCaptureMetadata }] },
    { id: 'rook', name: 'rook', displayName: 'Rook', description: 'Locked Standard Chess rook metadata.', teamAvailability: ['white', 'black'], movementRules: [{ id: 'rook-ray', type: 'ray', directions: 'orthogonal', offsets: '', maxDistance: 8, captureBehavior: 'move-and-capture', ...normalCaptureMetadata }] },
    { id: 'bishop', name: 'bishop', displayName: 'Bishop', description: 'Locked Standard Chess bishop metadata.', teamAvailability: ['white', 'black'], movementRules: [{ id: 'bishop-ray', type: 'ray', directions: 'diagonal', offsets: '', maxDistance: 8, captureBehavior: 'move-and-capture', ...normalCaptureMetadata }] },
    { id: 'knight', name: 'knight', displayName: 'Knight', description: 'Locked Standard Chess knight metadata.', teamAvailability: ['white', 'black'], movementRules: [{ id: 'knight-jump', type: 'jump', directions: '', offsets: '1,2; 2,1; -1,2; -2,1; 1,-2; 2,-1; -1,-2; -2,-1', maxDistance: 1, captureBehavior: 'move-and-capture', ...normalCaptureMetadata }] },
    { id: 'pawn', name: 'pawn', displayName: 'Pawn', description: 'Locked Standard Chess pawn metadata.', teamAvailability: ['white', 'black'], movementRules: [{ id: 'pawn-step', type: 'step', directions: 'forward', offsets: '', maxDistance: 1, captureBehavior: 'move-only', ...normalCaptureMetadata }] }
  ],
  promotionRules: [],
  winConditions: [{ id: 'standard-capture-king', type: 'capture-target-piece', targetPieceId: 'king', description: 'Capture the opponent king.' }],
  startingSetup: [],
  turnOrder: { teamIds: ['white', 'black'] },
  locked: true
};

const createRulesetId = () => {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (randomUuid) return `ruleset-${randomUuid}`;
  return `ruleset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export const createBlankCustomRuleset = (): CustomRuleset => ({
  id: createRulesetId(),
  type: 'custom',
  name: 'Untitled Custom Game',
  description: '',
  boardWidth: 8,
  boardHeight: 8,
  teams: [
    { id: 'team-1', name: 'Team 1' },
    { id: 'team-2', name: 'Team 2' }
  ],
  pieces: [],
  promotionRules: [],
  winConditions: [],
  startingSetup: [],
  turnOrder: { teamIds: ['team-1', 'team-2'] },
  forcedCaptures: false,
  multiJump: false,
  status: 'draft'
});

export const duplicateStandardChessRuleset = (): CustomRuleset => ({
  id: createRulesetId(),
  type: 'custom',
  name: 'Standard Chess Copy',
  description: 'Editable copy of Standard Chess.',
  boardWidth: STANDARD_CHESS_RULESET.boardWidth,
  boardHeight: STANDARD_CHESS_RULESET.boardHeight,
  teams: STANDARD_CHESS_RULESET.teams.map(team => ({ ...team })),
  pieces: STANDARD_CHESS_RULESET.pieces.map(piece => ({
    ...piece,
    teamAvailability: [...piece.teamAvailability],
    movementRules: piece.movementRules.map(rule => ({ ...rule })),
    description: piece.description?.replace('Locked Standard Chess', 'Editable Standard Chess copy')
  })),
  promotionRules: [],
  winConditions: STANDARD_CHESS_RULESET.winConditions.map(condition => ({ ...condition })),
  startingSetup: STANDARD_CHESS_RULESET.startingSetup.map(position => ({ ...position })),
  turnOrder: { teamIds: [...STANDARD_CHESS_RULESET.turnOrder.teamIds] },
  forcedCaptures: STANDARD_CHESS_RULESET.forcedCaptures,
  multiJump: STANDARD_CHESS_RULESET.multiJump,
  status: 'draft',
  sourceRulesetId: STANDARD_CHESS_RULESET.id
});

export const createBlankPieceDefinition = (teams: RuleTeam[]): RulePieceDefinition => ({
  id: `piece-${Date.now().toString(36)}`,
  name: 'new-piece',
  displayName: 'New Piece',
  description: '',
  teamAvailability: teams.map(team => team.id),
  movementRules: []
});

export const createBlankMovementRule = (): MovementRule => ({
  id: `move-${Date.now().toString(36)}`,
  type: 'step',
  directions: 'orthogonal',
  offsets: '',
  maxDistance: 1,
  captureBehavior: 'move-and-capture',
  ...normalCaptureMetadata
});

export const createBlankPromotionRule = (pieces: RulePieceDefinition[]): PromotionRule => ({
  id: `promotion-${Date.now().toString(36)}`,
  sourcePieceId: pieces[0]?.id ?? '',
  targetPieceId: pieces[1]?.id ?? pieces[0]?.id ?? '',
  condition: 'team-relative-last-row',
  zoneDescription: 'opponent back row'
});

export const createBlankWinCondition = (pieces: RulePieceDefinition[]): WinCondition => ({
  id: `win-${Date.now().toString(36)}`,
  type: 'eliminate-opponent-pieces',
  targetPieceId: pieces[0]?.id ?? '',
  description: ''
});

export const createBlankStartingPosition = (teams: RuleTeam[], pieces: RulePieceDefinition[]): StartingPosition => ({
  id: `setup-${Date.now().toString(36)}`,
  teamId: teams[0]?.id ?? '',
  pieceId: pieces[0]?.id ?? '',
  row: 0,
  col: 0
});

const createCheckersStartingSetup = (): StartingPosition[] => {
  const setup: StartingPosition[] = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      if ((row + col) % 2 === 1) setup.push({ id: `setup-black-${row}-${col}`, teamId: 'black', pieceId: 'checker', row, col });
    }
  }
  for (let row = 5; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      if ((row + col) % 2 === 1) setup.push({ id: `setup-red-${row}-${col}`, teamId: 'red', pieceId: 'checker', row, col });
    }
  }
  return setup;
};

export const createCheckersTemplateRuleset = (): CustomRuleset => {
  const checkerMovement: MovementRule[] = [
    { id: 'checker-step-forward', type: 'step', directions: 'forward diagonal', offsets: '', maxDistance: 1, captureBehavior: 'move-only', ...normalCaptureMetadata },
    { id: 'checker-jump-forward-left', type: 'jump', directions: '', offsets: '-2,2', maxDistance: 1, captureBehavior: 'capture-only', captureMethod: 'jump', captureRequired: true, landingSquareRequired: true, capturedPieceOffset: '-1,1' },
    { id: 'checker-jump-forward-right', type: 'jump', directions: '', offsets: '2,2', maxDistance: 1, captureBehavior: 'capture-only', captureMethod: 'jump', captureRequired: true, landingSquareRequired: true, capturedPieceOffset: '1,1' },
    { id: 'checker-jump-back-left', type: 'jump', directions: '', offsets: '-2,-2', maxDistance: 1, captureBehavior: 'capture-only', captureMethod: 'jump', captureRequired: true, landingSquareRequired: true, capturedPieceOffset: '-1,-1' },
    { id: 'checker-jump-back-right', type: 'jump', directions: '', offsets: '2,-2', maxDistance: 1, captureBehavior: 'capture-only', captureMethod: 'jump', captureRequired: true, landingSquareRequired: true, capturedPieceOffset: '1,-1' }
  ];
  const kingMovement: MovementRule[] = [
    { id: 'checker-king-step', type: 'step', directions: 'all diagonal', offsets: '', maxDistance: 1, captureBehavior: 'move-only', ...normalCaptureMetadata },
    { id: 'checker-king-jump-forward-left', type: 'jump', directions: '', offsets: '-2,2', maxDistance: 1, captureBehavior: 'capture-only', captureMethod: 'jump', captureRequired: true, landingSquareRequired: true, capturedPieceOffset: '-1,1' },
    { id: 'checker-king-jump-forward-right', type: 'jump', directions: '', offsets: '2,2', maxDistance: 1, captureBehavior: 'capture-only', captureMethod: 'jump', captureRequired: true, landingSquareRequired: true, capturedPieceOffset: '1,1' },
    { id: 'checker-king-jump-back-left', type: 'jump', directions: '', offsets: '-2,-2', maxDistance: 1, captureBehavior: 'capture-only', captureMethod: 'jump', captureRequired: true, landingSquareRequired: true, capturedPieceOffset: '-1,-1' },
    { id: 'checker-king-jump-back-right', type: 'jump', directions: '', offsets: '2,-2', maxDistance: 1, captureBehavior: 'capture-only', captureMethod: 'jump', captureRequired: true, landingSquareRequired: true, capturedPieceOffset: '1,-1' }
  ];

  return {
    id: createRulesetId(),
    type: 'custom',
    name: 'Checkers Template',
    description: 'Editable metadata draft for a Checkers-style custom game.',
    boardWidth: 8,
    boardHeight: 8,
    teams: [
      { id: 'red', name: 'Red' },
      { id: 'black', name: 'Black' }
    ],
    pieces: [
      { id: 'checker', name: 'checker', displayName: 'Checker', description: 'Base checker piece.', teamAvailability: ['red', 'black'], movementRules: checkerMovement },
      { id: 'king', name: 'king', displayName: 'King', description: 'Promoted checker piece.', teamAvailability: ['red', 'black'], movementRules: kingMovement }
    ],
    promotionRules: [{ id: 'checker-promotes-to-king', sourcePieceId: 'checker', targetPieceId: 'king', condition: 'team-relative-last-row', zoneDescription: 'opponent back row' }],
    winConditions: [
      { id: 'checkers-eliminate', type: 'eliminate-opponent-pieces', targetPieceId: '', description: 'Win by removing all opponent pieces.' },
      { id: 'checkers-no-moves', type: 'opponent-no-legal-moves', targetPieceId: '', description: 'Win when the opponent has no legal moves.' }
    ],
    startingSetup: createCheckersStartingSetup(),
    turnOrder: { teamIds: ['red', 'black'] },
    forcedCaptures: true,
    multiJump: true,
    status: 'draft'
  };
};

const offsetPattern = /^-?\d+\s*,\s*-?\d+$/;

const hasValidOffsetList = (offsets: string) =>
  offsets
    .split(';')
    .map(offset => offset.trim())
    .filter(Boolean)
    .every(offset => offsetPattern.test(offset));

export const getMovementRuleSummary = (rule: MovementRule) => {
  const behavior = rule.captureBehavior === 'move-only'
    ? 'move only'
    : rule.captureBehavior === 'capture-only'
      ? 'capture only'
      : 'move and capture';
  const captureMethod = rule.captureMethod ?? 'normal';
  const captureNotes = [
    captureMethod === 'jump' ? 'jump capture' : 'normal capture',
    rule.captureRequired ? 'capture required' : '',
    rule.landingSquareRequired ? 'landing required' : '',
    captureMethod === 'jump' && rule.capturedPieceOffset ? `captured piece at ${rule.capturedPieceOffset}` : ''
  ].filter(Boolean).join(', ');
  if (rule.type === 'jump') return `Jump by offsets ${rule.offsets || '(missing offsets)'} - ${behavior} - ${captureNotes}`;
  return `${rule.type === 'ray' ? 'Ray' : 'Step'} ${rule.directions || '(missing directions)'} up to ${rule.maxDistance} - ${behavior} - ${captureNotes}`;
};

export const getPromotionRuleSummary = (rule: PromotionRule, pieces: RulePieceDefinition[]) => {
  const source = pieces.find(piece => piece.id === rule.sourcePieceId);
  const target = pieces.find(piece => piece.id === rule.targetPieceId);
  const sourceName = source?.displayName || source?.name || rule.sourcePieceId || '(missing source)';
  const targetName = target?.displayName || target?.name || rule.targetPieceId || '(missing target)';
  const zone = rule.zoneDescription || 'the far row';
  return `${sourceName} promotes to ${targetName} on ${zone}`;
};

export const getWinConditionSummary = (condition: WinCondition, pieces: RulePieceDefinition[]) => {
  if (condition.type === 'eliminate-opponent-pieces') return 'Win by eliminating all opponent pieces';
  if (condition.type === 'opponent-no-legal-moves') return 'Win when the opponent has no legal moves';
  if (condition.type === 'capture-target-piece') {
    const target = pieces.find(piece => piece.id === condition.targetPieceId);
    return `Win by capturing ${target?.displayName || target?.name || condition.targetPieceId || '(missing target piece)'}`;
  }
  return condition.description || 'Custom win condition';
};

export const getStartingPositionSummary = (position: StartingPosition, teams: RuleTeam[], pieces: RulePieceDefinition[]) => {
  const team = teams.find(item => item.id === position.teamId);
  const piece = pieces.find(item => item.id === position.pieceId);
  const teamName = team?.name || position.teamId || '(missing team)';
  const pieceName = piece?.displayName || piece?.name || position.pieceId || '(missing piece)';
  return `${teamName} ${pieceName} starts at row ${position.row + 1}, column ${position.col + 1}`;
};

export const getTurnOrderSummary = (turnOrder: TurnOrder | undefined, teams: RuleTeam[]) => {
  const teamIds = turnOrder?.teamIds ?? [];
  if (teamIds.length === 0) return 'No turn order set';
  return teamIds
    .map(teamId => teams.find(team => team.id === teamId)?.name || teamId)
    .join(' then ');
};

export const isSandboxPlayableRuleset = (ruleset: CustomRuleset) => {
  const validation = validateCustomRuleset(ruleset);
  const hasSimpleMovement = (ruleset.pieces ?? []).some(piece =>
    (piece.movementRules ?? []).some(rule => rule.type === 'step' || rule.type === 'jump')
  );
  const hasExecutableWinCondition = (ruleset.winConditions ?? []).some(condition =>
    condition.type === 'eliminate-opponent-pieces' || condition.type === 'opponent-no-legal-moves'
  );
  const unsupportedMovement = (ruleset.pieces ?? []).flatMap(piece =>
    (piece.movementRules ?? [])
      .filter(rule => rule.type === 'ray' || (rule.type === 'step' && rule.captureBehavior === 'capture-only'))
      .map(rule => `${piece.displayName || piece.name || piece.id} uses ${rule.type === 'ray' ? 'Ray movement' : 'capture-only Step movement'}, which is not playable in the first custom runtime.`)
  );
  const unsupportedWinConditions = (ruleset.winConditions ?? [])
    .filter(condition => !['eliminate-opponent-pieces', 'opponent-no-legal-moves'].includes(condition.type))
    .map(condition => `${getWinConditionSummary(condition, ruleset.pieces ?? [])} is metadata-only for now.`);
  const hasForcedCaptureJumpSupport = !ruleset.forcedCaptures || (ruleset.pieces ?? []).some(piece =>
    (piece.movementRules ?? []).some(rule => rule.type === 'jump' && rule.captureMethod === 'jump' && rule.captureBehavior !== 'move-only')
  );
  const hasMultiJumpSupport = !ruleset.multiJump || (ruleset.pieces ?? []).some(piece =>
    (piece.movementRules ?? []).some(rule => rule.type === 'jump' && rule.captureMethod === 'jump' && rule.captureBehavior !== 'move-only')
  );
  return {
    playable: validation.valid &&
      ruleset.status === 'approved' &&
      (ruleset.startingSetup ?? []).length > 0 &&
      (ruleset.turnOrder?.teamIds ?? []).length >= 2 &&
      hasSimpleMovement &&
      hasExecutableWinCondition &&
      unsupportedMovement.length === 0 &&
      unsupportedWinConditions.length === 0 &&
      hasForcedCaptureJumpSupport &&
      hasMultiJumpSupport,
    messages: [
      ...validation.messages,
      ...(!hasSimpleMovement ? ['Add Step or Jump movement for sandbox play.'] : []),
      ...(!hasExecutableWinCondition ? ['Add eliminate-pieces or no-legal-moves win condition for sandbox play.'] : []),
      ...unsupportedMovement,
      ...unsupportedWinConditions,
      ...(!hasForcedCaptureJumpSupport ? ['Forced captures need at least one supported jump-capture rule.'] : []),
      ...(!hasMultiJumpSupport ? ['Multi-jump needs at least one supported jump-capture rule.'] : []),
      ...((ruleset.startingSetup ?? []).length === 0 ? ['Add starting setup before sandbox play.'] : []),
      ...((ruleset.turnOrder?.teamIds ?? []).length < 2 ? ['Add a two-team turn order before sandbox play.'] : [])
    ]
  };
};

export const validateCustomRuleset = (ruleset: CustomRuleset) => {
  const messages: string[] = [];

  if (!ruleset.id || ruleset.type !== 'custom') messages.push('Ruleset must have a custom type and ID.');
  if (!ruleset.name.trim()) messages.push('Name is required.');
  if (!Number.isInteger(ruleset.boardWidth) || ruleset.boardWidth < 1 || ruleset.boardWidth > 32) {
    messages.push('Board width must be a whole number from 1 to 32.');
  }
  if (!Number.isInteger(ruleset.boardHeight) || ruleset.boardHeight < 1 || ruleset.boardHeight > 32) {
    messages.push('Board height must be a whole number from 1 to 32.');
  }
  if (ruleset.teams.filter(team => team.name.trim()).length < 2) {
    messages.push('At least two teams are required.');
  }
  const pieces = ruleset.pieces ?? [];
  if (pieces.length === 0) {
    messages.push('Add at least one piece definition.');
  }
  const pieceIds = pieces.map(piece => piece.id.trim()).filter(Boolean);
  if (pieceIds.length !== pieces.length) messages.push('Every piece needs a piece ID.');
  if (new Set(pieceIds).size !== pieceIds.length) messages.push('Piece IDs must be unique within this ruleset.');
  pieces.forEach(piece => {
    if (!piece.name.trim()) messages.push(`Piece "${piece.id || 'unknown'}" needs a name.`);
    if (!piece.displayName.trim()) messages.push(`Piece "${piece.id || piece.name || 'unknown'}" needs a display name.`);
    const movementRules = piece.movementRules ?? [];
    if (movementRules.length === 0) messages.push(`Piece "${piece.displayName || piece.id || 'unknown'}" needs at least one movement rule.`);
    movementRules.forEach(rule => {
      if (!['step', 'ray', 'jump'].includes(rule.type)) messages.push(`Piece "${piece.displayName || piece.id}" has an unsupported movement type.`);
      if ((rule.type === 'step' || rule.type === 'ray') && !rule.directions.trim()) {
        messages.push(`Piece "${piece.displayName || piece.id}" needs directions for ${rule.type} movement.`);
      }
      if (rule.type === 'jump' && !rule.offsets.trim()) {
        messages.push(`Piece "${piece.displayName || piece.id}" needs offsets for jump movement.`);
      }
      if (rule.offsets.trim() && !hasValidOffsetList(rule.offsets)) {
        messages.push(`Piece "${piece.displayName || piece.id}" has jump offsets that must look like "2,2; -2,2".`);
      }
      if (!Number.isInteger(rule.maxDistance) || rule.maxDistance < 1 || rule.maxDistance > 32) {
        messages.push(`Piece "${piece.displayName || piece.id}" has an invalid max distance.`);
      }
      if (!['move-only', 'capture-only', 'move-and-capture'].includes(rule.captureBehavior)) {
        messages.push(`Piece "${piece.displayName || piece.id}" has an unsupported capture behavior.`);
      }
      const captureMethod = rule.captureMethod ?? 'normal';
      if (!['normal', 'jump'].includes(captureMethod)) {
        messages.push(`Piece "${piece.displayName || piece.id}" has an unsupported capture method.`);
      }
      if (rule.captureRequired && rule.captureBehavior === 'move-only') {
        messages.push(`Piece "${piece.displayName || piece.id}" cannot require captures on a move-only rule.`);
      }
      if (captureMethod === 'jump') {
        if (rule.type !== 'jump') {
          messages.push(`Piece "${piece.displayName || piece.id}" can only use jump capture on Jump movement.`);
        }
        if (rule.captureBehavior === 'move-only') {
          messages.push(`Piece "${piece.displayName || piece.id}" needs capture behavior for jump capture.`);
        }
        if (!rule.landingSquareRequired) {
          messages.push(`Piece "${piece.displayName || piece.id}" needs a landing square for jump capture.`);
        }
        if (!rule.capturedPieceOffset?.trim()) {
          messages.push(`Piece "${piece.displayName || piece.id}" needs the captured piece position for jump capture.`);
        } else if (!offsetPattern.test(rule.capturedPieceOffset.trim())) {
          messages.push(`Piece "${piece.displayName || piece.id}" captured piece position must look like "1,1".`);
        }
      }
    });
  });
  const promotionRules = ruleset.promotionRules ?? [];
  promotionRules.forEach(rule => {
    const sourceExists = pieces.some(piece => piece.id === rule.sourcePieceId);
    const targetExists = pieces.some(piece => piece.id === rule.targetPieceId);
    if (!rule.sourcePieceId.trim()) messages.push('Promotion rule needs a source piece.');
    if (!rule.targetPieceId.trim()) messages.push('Promotion rule needs a promoted piece.');
    if (rule.sourcePieceId && !sourceExists) messages.push(`Promotion source "${rule.sourcePieceId}" does not match an existing piece.`);
    if (rule.targetPieceId && !targetExists) messages.push(`Promotion target "${rule.targetPieceId}" does not match an existing piece.`);
    if (!['team-relative-last-row'].includes(rule.condition)) {
      messages.push('Promotion rule uses an unsupported condition.');
    }
    if (!(rule.zoneDescription ?? '').trim()) {
      messages.push('Promotion rule needs a promotion zone description.');
    }
  });
  const winConditions = ruleset.winConditions ?? [];
  if (winConditions.length === 0) {
    messages.push('Add at least one win condition.');
  }
  winConditions.forEach(condition => {
    if (!['eliminate-opponent-pieces', 'opponent-no-legal-moves', 'capture-target-piece', 'custom'].includes(condition.type)) {
      messages.push('Win condition uses an unsupported type.');
    }
    if (condition.type === 'capture-target-piece') {
      if (!(condition.targetPieceId ?? '').trim()) {
        messages.push('Capture target win condition needs a target piece.');
      } else if (!pieces.some(piece => piece.id === condition.targetPieceId)) {
        messages.push(`Win condition target "${condition.targetPieceId}" does not match an existing piece.`);
      }
    }
    if (condition.type === 'custom' && !(condition.description ?? '').trim()) {
      messages.push('Custom win condition needs a description.');
    }
  });
  const startingSetup = ruleset.startingSetup ?? [];
  const occupiedSquares = new Set<string>();
  startingSetup.forEach(position => {
    const squareKey = `${position.row},${position.col}`;
    if (!position.teamId.trim()) messages.push('Starting setup entry needs a team.');
    if (position.teamId && !ruleset.teams.some(team => team.id === position.teamId)) {
      messages.push(`Starting setup team "${position.teamId}" does not match an existing team.`);
    }
    if (!position.pieceId.trim()) messages.push('Starting setup entry needs a piece.');
    if (position.pieceId && !pieces.some(piece => piece.id === position.pieceId)) {
      messages.push(`Starting setup piece "${position.pieceId}" does not match an existing piece.`);
    }
    if (!Number.isInteger(position.row) || position.row < 0 || position.row >= ruleset.boardHeight) {
      messages.push(`Starting square row ${position.row + 1} is outside the board.`);
    }
    if (!Number.isInteger(position.col) || position.col < 0 || position.col >= ruleset.boardWidth) {
      messages.push(`Starting square column ${position.col + 1} is outside the board.`);
    }
    if (occupiedSquares.has(squareKey)) {
      messages.push(`Only one piece can start on row ${position.row + 1}, column ${position.col + 1}.`);
    }
    occupiedSquares.add(squareKey);
  });
  const turnOrderTeamIds = ruleset.turnOrder?.teamIds ?? [];
  if (turnOrderTeamIds.length === 0) {
    messages.push('Turn order needs at least one team.');
  }
  if (ruleset.teams.length >= 2 && turnOrderTeamIds.length < 2) {
    messages.push('Turn order should include at least two teams for a two-player game.');
  }
  const seenTurnTeams = new Set<string>();
  turnOrderTeamIds.forEach(teamId => {
    if (!ruleset.teams.some(team => team.id === teamId)) {
      messages.push(`Turn order team "${teamId}" does not match an existing team.`);
    }
    if (seenTurnTeams.has(teamId)) {
      messages.push(`Turn order includes "${teamId}" more than once.`);
    }
    seenTurnTeams.add(teamId);
  });

  return {
    valid: messages.length === 0,
    messages: messages.length ? messages : ['Ruleset metadata looks valid.']
  };
};
