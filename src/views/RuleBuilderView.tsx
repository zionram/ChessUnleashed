import React, { useMemo, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import {
  createBlankCustomRuleset,
  createBlankMovementRule,
  createBlankPieceDefinition,
  createBlankPromotionRule,
  createBlankStartingPosition,
  createBlankWinCondition,
  createCheckersTemplateRuleset,
  duplicateStandardChessRuleset,
  getMovementRuleSummary,
  getPromotionRuleSummary,
  getStartingPositionSummary,
  getTurnOrderSummary,
  getWinConditionSummary,
  isSandboxPlayableRuleset,
  validateCustomRuleset,
  type CustomRuleset,
  type MovementRule,
  type PromotionRule,
  type RulePieceDefinition,
  type StartingPosition,
  type WinCondition
} from '../rules/RulePackages';

const statusLabels: Record<CustomRuleset['status'], string> = {
  draft: 'Draft',
  validated: 'Validated',
  tested: 'Tested',
  approved: 'Approved'
};

type RuleBuilderLayer = 'simple' | 'advanced' | 'system';
type SandboxMode = 'preview' | 'test-play';
type TestMove = {
  row: number;
  col: number;
  capturedPositionId?: string;
};
type RulesetImportPreview = {
  sourceName: string;
  ruleset: CustomRuleset;
  validation: ReturnType<typeof validateCustomRuleset>;
};

const layerLabels: Record<RuleBuilderLayer, string> = {
  simple: 'Simple',
  advanced: 'Advanced',
  system: 'System'
};

const getRulesetReadiness = (ruleset: CustomRuleset) => {
  const readiness = isSandboxPlayableRuleset(ruleset);
  const messages = readiness.messages.filter(message => message !== 'Ruleset metadata looks valid.');
  if (readiness.playable) {
    return { label: 'Ready to Play', color: '#166534', background: '#f0fdf4', border: '#86efac', messages };
  }
  if (ruleset.status === 'approved') {
    return { label: 'Unsupported Features', color: '#92400e', background: '#fffbeb', border: '#fde68a', messages };
  }
  return { label: 'Needs Review', color: '#475569', background: '#f8fafc', border: '#cbd5e1', messages };
};

const checkersJumpOffsets = [
  { label: 'Forward-left jump', offsets: '-2,2', capturedPieceOffset: '-1,1' },
  { label: 'Forward-right jump', offsets: '2,2', capturedPieceOffset: '1,1' },
  { label: 'Backward-left jump', offsets: '-2,-2', capturedPieceOffset: '-1,-1' },
  { label: 'Backward-right jump', offsets: '2,-2', capturedPieceOffset: '1,-1' }
];

const parseRuleOffsets = (offsets: string) =>
  offsets
    .split(';')
    .map(offset => offset.trim())
    .filter(Boolean)
    .map(offset => {
      const [col, row] = offset.split(',').map(value => Number(value.trim()));
      return Number.isFinite(row) && Number.isFinite(col) ? { row, col } : null;
    })
    .filter((offset): offset is { row: number; col: number } => Boolean(offset));

const RuleBuilderView: React.FC = () => {
  const { settings, createCustomRuleset, updateCustomRuleset, deleteCustomRuleset } = useSettings();
  const [selectedRulesetId, setSelectedRulesetId] = useState<string | null>(null);
  const [sandboxRulesetId, setSandboxRulesetId] = useState<string | null>(null);
  const [sandboxMode, setSandboxMode] = useState<SandboxMode>('preview');
  const [selectedTestSquare, setSelectedTestSquare] = useState<{ row: number; col: number } | null>(null);
  const [testBoardSetup, setTestBoardSetup] = useState<StartingPosition[]>([]);
  const [testTurnIndex, setTestTurnIndex] = useState(0);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [multiJumpPieceId, setMultiJumpPieceId] = useState<string | null>(null);
  const [showCreateChoices, setShowCreateChoices] = useState(false);
  const [ruleBuilderLayer, setRuleBuilderLayer] = useState<RuleBuilderLayer>('simple');
  const [importPreview, setImportPreview] = useState<RulesetImportPreview | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);
  const [pendingDeleteRulesetId, setPendingDeleteRulesetId] = useState<string | null>(null);
  const [setupBrush, setSetupBrush] = useState<{ teamId: string; pieceId: string }>({ teamId: '', pieceId: '' });
  const selectedRuleset = settings.customRulesets.find(ruleset => ruleset.id === selectedRulesetId) ?? null;
  const sandboxRuleset = settings.customRulesets.find(ruleset => ruleset.id === sandboxRulesetId) ?? null;
  const validation = useMemo(() => selectedRuleset ? validateCustomRuleset(selectedRuleset) : null, [selectedRuleset]);
  const sandboxValidation = useMemo(() => sandboxRuleset ? validateCustomRuleset(sandboxRuleset) : null, [sandboxRuleset]);

  const createNew = () => {
    const ruleset = createBlankCustomRuleset();
    createCustomRuleset(ruleset);
    setSelectedRulesetId(ruleset.id);
    setRuleBuilderLayer('simple');
    setShowCreateChoices(false);
  };

  const duplicateStandard = () => {
    const ruleset = duplicateStandardChessRuleset();
    createCustomRuleset(ruleset);
    setSelectedRulesetId(ruleset.id);
    setRuleBuilderLayer('simple');
    setShowCreateChoices(false);
  };

  const loadCheckersTemplate = () => {
    const ruleset = createCheckersTemplateRuleset();
    createCustomRuleset(ruleset);
    setSelectedRulesetId(ruleset.id);
    setRuleBuilderLayer('simple');
    setShowCreateChoices(false);
  };

  const goBackLayer = () => {
    if (ruleBuilderLayer === 'system') setRuleBuilderLayer('advanced');
    if (ruleBuilderLayer === 'advanced') setRuleBuilderLayer('simple');
  };

  const updateSelectedRuleset = (updates: Partial<CustomRuleset>) => {
    if (!selectedRuleset) return;
    setApprovalMessage(null);
    updateCustomRuleset(selectedRuleset.id, updates);
  };

  const updateTeamName = (teamIndex: number, name: string) => {
    if (!selectedRuleset) return;
    updateSelectedRuleset({
      teams: selectedRuleset.teams.map((team, index) =>
        index === teamIndex ? { ...team, name } : team
      )
    });
  };

  const getSelectedPieces = () => selectedRuleset?.pieces ?? [];

  const addPiece = () => {
    if (!selectedRuleset) return;
    updateSelectedRuleset({
      pieces: [...getSelectedPieces(), createBlankPieceDefinition(selectedRuleset.teams)]
    });
  };

  const updatePiece = (pieceIndex: number, updates: Partial<RulePieceDefinition>) => {
    if (!selectedRuleset) return;
    updateSelectedRuleset({
      pieces: getSelectedPieces().map((piece, index) =>
        index === pieceIndex ? { ...piece, ...updates } : piece
      )
    });
  };

  const togglePieceTeam = (pieceIndex: number, teamId: string) => {
    const piece = getSelectedPieces()[pieceIndex];
    if (!piece) return;
    updatePiece(pieceIndex, {
      teamAvailability: piece.teamAvailability.includes(teamId)
        ? piece.teamAvailability.filter(id => id !== teamId)
        : [...piece.teamAvailability, teamId]
    });
  };

  const addMovementRule = (pieceIndex: number) => {
    const piece = getSelectedPieces()[pieceIndex];
    if (!piece) return;
    updatePiece(pieceIndex, {
      movementRules: [...(piece.movementRules ?? []), createBlankMovementRule()]
    });
  };

  const updateMovementRule = (pieceIndex: number, ruleIndex: number, updates: Partial<MovementRule>) => {
    const piece = getSelectedPieces()[pieceIndex];
    if (!piece) return;
    updatePiece(pieceIndex, {
      movementRules: (piece.movementRules ?? []).map((rule, index) =>
        index === ruleIndex ? { ...rule, ...updates } : rule
      )
    });
  };

  const addPromotionRule = () => {
    if (!selectedRuleset) return;
    updateSelectedRuleset({
      promotionRules: [...(selectedRuleset.promotionRules ?? []), createBlankPromotionRule(getSelectedPieces())]
    });
  };

  const updatePromotionRule = (ruleIndex: number, updates: Partial<PromotionRule>) => {
    if (!selectedRuleset) return;
    updateSelectedRuleset({
      promotionRules: (selectedRuleset.promotionRules ?? []).map((rule, index) =>
        index === ruleIndex ? { ...rule, ...updates } : rule
      )
    });
  };

  const removePromotionRule = (ruleIndex: number) => {
    if (!selectedRuleset) return;
    updateSelectedRuleset({
      promotionRules: (selectedRuleset.promotionRules ?? []).filter((_, index) => index !== ruleIndex)
    });
  };

  const addWinCondition = () => {
    if (!selectedRuleset) return;
    updateSelectedRuleset({
      winConditions: [...(selectedRuleset.winConditions ?? []), createBlankWinCondition(getSelectedPieces())]
    });
  };

  const updateWinCondition = (conditionIndex: number, updates: Partial<WinCondition>) => {
    if (!selectedRuleset) return;
    updateSelectedRuleset({
      winConditions: (selectedRuleset.winConditions ?? []).map((condition, index) =>
        index === conditionIndex ? { ...condition, ...updates } : condition
      )
    });
  };

  const removeWinCondition = (conditionIndex: number) => {
    if (!selectedRuleset) return;
    updateSelectedRuleset({
      winConditions: (selectedRuleset.winConditions ?? []).filter((_, index) => index !== conditionIndex)
    });
  };

  const addStartingPosition = () => {
    if (!selectedRuleset) return;
    updateSelectedRuleset({
      startingSetup: [...(selectedRuleset.startingSetup ?? []), createBlankStartingPosition(selectedRuleset.teams, getSelectedPieces())]
    });
  };

  const updateStartingPosition = (positionIndex: number, updates: Partial<StartingPosition>) => {
    if (!selectedRuleset) return;
    updateSelectedRuleset({
      startingSetup: (selectedRuleset.startingSetup ?? []).map((position, index) =>
        index === positionIndex ? { ...position, ...updates } : position
      )
    });
  };

  const removeStartingPosition = (positionIndex: number) => {
    if (!selectedRuleset) return;
    updateSelectedRuleset({
      startingSetup: (selectedRuleset.startingSetup ?? []).filter((_, index) => index !== positionIndex)
    });
  };

  const toggleStartingSquare = (row: number, col: number) => {
    if (!selectedRuleset) return;
    const setup = selectedRuleset.startingSetup ?? [];
    const existing = setup.find(position => position.row === row && position.col === col);
    if (existing) {
      updateSelectedRuleset({
        startingSetup: setup.filter(position => position.id !== existing.id)
      });
      return;
    }
    const teamId = setupBrush.teamId || selectedRuleset.teams[0]?.id || '';
    const pieceId = setupBrush.pieceId || getSelectedPieces()[0]?.id || '';
    if (!teamId || !pieceId) return;
    updateSelectedRuleset({
      startingSetup: [
        ...setup,
        {
          id: `setup-${Date.now().toString(36)}-${row}-${col}`,
          teamId,
          pieceId,
          row,
          col
        }
      ]
    });
  };

  const updateTurnOrderTeam = (orderIndex: number, teamId: string) => {
    if (!selectedRuleset) return;
    const currentOrder = selectedRuleset.turnOrder?.teamIds ?? selectedRuleset.teams.map(team => team.id);
    updateSelectedRuleset({
      turnOrder: {
        teamIds: currentOrder.map((currentTeamId, index) =>
          index === orderIndex ? teamId : currentTeamId
        )
      }
    });
  };

  const resetTurnOrderFromTeams = () => {
    if (!selectedRuleset) return;
    updateSelectedRuleset({
      turnOrder: { teamIds: selectedRuleset.teams.map(team => team.id) }
    });
  };

  const createRulesetImportId = () => {
    const randomUuid = globalThis.crypto?.randomUUID?.();
    if (randomUuid) return `ruleset-imported-${randomUuid}`;
    return `ruleset-imported-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  };

  const createImportDraft = (ruleset: CustomRuleset): CustomRuleset => ({
    ...JSON.parse(JSON.stringify(ruleset)),
    id: createRulesetImportId(),
    type: 'custom',
    name: ruleset.name?.trim() ? ruleset.name : 'Imported Custom Game',
    status: 'draft',
    sourceRulesetId: ruleset.id
  });

  const duplicateRuleset = (ruleset: CustomRuleset) => {
    const copy = createImportDraft(ruleset);
    copy.name = `${ruleset.name || 'Custom Game'} Copy`;
    createCustomRuleset(copy);
    setSelectedRulesetId(copy.id);
    setRuleBuilderLayer('simple');
    setApprovalMessage('Duplicated as an editable draft.');
  };

  const confirmDeleteRuleset = (rulesetId: string) => {
    deleteCustomRuleset(rulesetId);
    if (selectedRulesetId === rulesetId) setSelectedRulesetId(null);
    if (sandboxRulesetId === rulesetId) setSandboxRulesetId(null);
    setPendingDeleteRulesetId(null);
    setApprovalMessage(null);
  };

  const getRulesetFromImport = (candidate: unknown): CustomRuleset | null => {
    const value = candidate as { format?: string; contents?: { customRulesets?: CustomRuleset[]; ruleset?: CustomRuleset }; type?: string } | null;
    if (!value || typeof value !== 'object') return null;
    if (value.format === 'chess-unleashed-experience' && Array.isArray(value.contents?.customRulesets)) {
      return value.contents.customRulesets[0] ?? null;
    }
    if (value.format === 'chess-unleashed-custom-ruleset' && value.contents?.ruleset) {
      return value.contents.ruleset;
    }
    if (value.type === 'custom') {
      return value as CustomRuleset;
    }
    return null;
  };

  const importRulesetFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setImportError(null);
    setImportPreview(null);
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const importedRuleset = getRulesetFromImport(parsed);
      if (!importedRuleset) {
        setImportError('This file does not contain a custom ruleset.');
        return;
      }
      const draft = createImportDraft(importedRuleset);
      setImportPreview({
        sourceName: file.name,
        ruleset: draft,
        validation: validateCustomRuleset(draft)
      });
      setShowCreateChoices(false);
    } catch {
      setImportError('That file could not be read as valid JSON.');
    }
  };

  const applyImportedRuleset = () => {
    if (!importPreview?.validation.valid) return;
    createCustomRuleset(importPreview.ruleset);
    setSelectedRulesetId(importPreview.ruleset.id);
    setRuleBuilderLayer('simple');
    setImportPreview(null);
    setImportError(null);
  };

  const exportSelectedRuleset = () => {
    if (!selectedRuleset || !validation?.valid) return;
    const packageObject = {
      format: 'chess-unleashed-experience',
      metadata: {
        name: selectedRuleset.name || 'Custom Ruleset',
        version: '1.0.0',
        description: 'Custom ruleset metadata export.'
      },
      contents: {
        customRulesets: [selectedRuleset]
      }
    };
    const blob = new Blob([JSON.stringify(packageObject, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = (selectedRuleset.name || 'custom-ruleset').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'custom-ruleset';
    link.href = url;
    link.download = `${safeName}-custom-game.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const runValidation = () => {
    if (!selectedRuleset || !validation?.valid) return;
    updateCustomRuleset(selectedRuleset.id, { status: 'validated' });
    setApprovalMessage('Ruleset metadata is valid.');
  };

  const approveRuleset = () => {
    if (!selectedRuleset || !validation) return;
    if (!validation.valid) {
      setApprovalMessage(`Approval blocked: ${validation.messages.join(' ')}`);
      return;
    }
    updateCustomRuleset(selectedRuleset.id, { status: 'approved' });
    setApprovalMessage('Ruleset approved. It is ready for future Custom Game use.');
  };

  const openSandbox = () => {
    if (!selectedRuleset || !validation?.valid) return;
    setSandboxMode('preview');
    setSelectedTestSquare(null);
    setTestBoardSetup([]);
    setTestTurnIndex(0);
    setTestMessage(null);
    setTestResult(null);
    setMultiJumpPieceId(null);
    setSandboxRulesetId(selectedRuleset.id);
  };

  const openTestPlaySandbox = () => {
    if (!selectedRuleset || selectedRuleset.status !== 'approved') return;
    setSandboxMode('test-play');
    setSelectedTestSquare(null);
    setTestBoardSetup((selectedRuleset.startingSetup ?? []).map(position => ({ ...position })));
    setTestTurnIndex(0);
    setTestMessage('Test board loaded. Select a piece for the current turn.');
    setTestResult(null);
    setMultiJumpPieceId(null);
    setSandboxRulesetId(selectedRuleset.id);
  };

  if (sandboxRuleset) {
    const columns = Array.from({ length: sandboxRuleset.boardWidth });
    const cells = Array.from({ length: sandboxRuleset.boardWidth * sandboxRuleset.boardHeight });
    const activeSetup = sandboxMode === 'test-play' ? testBoardSetup : (sandboxRuleset.startingSetup ?? []);
    const turnTeamIds = sandboxRuleset.turnOrder?.teamIds ?? sandboxRuleset.teams.map(team => team.id);
    const currentTurnTeamId = turnTeamIds[testTurnIndex % Math.max(1, turnTeamIds.length)] ?? turnTeamIds[0] ?? '';
    const currentTurnTeam = sandboxRuleset.teams.find(team => team.id === currentTurnTeamId);
    const selectedSetupPiece = selectedTestSquare
      ? activeSetup.find(position => position.row === selectedTestSquare.row && position.col === selectedTestSquare.col)
      : null;
    const selectedPieceDefinition = selectedSetupPiece
      ? (sandboxRuleset.pieces ?? []).find(piece => piece.id === selectedSetupPiece.pieceId)
      : null;
    const getMovesForPiece = (setupPiece: StartingPosition, warnings: string[] = []): TestMove[] => {
      const pieceDefinition = (sandboxRuleset.pieces ?? []).find(piece => piece.id === setupPiece.pieceId);
      if (!pieceDefinition) return [];
      const teamIndex = sandboxRuleset.teams.findIndex(team => team.id === setupPiece.teamId);
      const forwardDirection = teamIndex <= 0 ? -1 : 1;
      return (pieceDefinition.movementRules ?? []).flatMap(rule => {
          if (rule.type === 'ray') {
            warnings.push(`${pieceDefinition.displayName || pieceDefinition.name} has Ray movement. Ray preview is coming later.`);
            return [];
          }
          if (rule.type === 'jump') {
            const offsets = parseRuleOffsets(rule.offsets);
            if (offsets.length === 0) {
              warnings.push(`${pieceDefinition.displayName || pieceDefinition.name} has a Jump rule with no readable offsets.`);
            }
            return offsets.flatMap(offset => {
              const destination = { row: setupPiece.row + offset.row, col: setupPiece.col + offset.col };
              const occupiedDestination = activeSetup.find(position => position.row === destination.row && position.col === destination.col);
              if (occupiedDestination) return [];
              if (rule.captureBehavior === 'capture-only' && (rule.captureMethod ?? 'normal') !== 'jump') {
                warnings.push(`${pieceDefinition.displayName || pieceDefinition.name} has a capture-only Jump rule without jump capture metadata.`);
                return [];
              }
              if ((rule.captureMethod ?? 'normal') !== 'jump') return [destination];
              const capturedOffset = parseRuleOffsets(rule.capturedPieceOffset ?? '')[0];
              if (!capturedOffset) {
                warnings.push(`${pieceDefinition.displayName || pieceDefinition.name} has a jump capture without a readable captured piece position.`);
                return [];
              }
              const capturedPiece = activeSetup.find(position =>
                position.row === setupPiece.row + capturedOffset.row &&
                position.col === setupPiece.col + capturedOffset.col
              );
              if (!capturedPiece || capturedPiece.teamId === setupPiece.teamId) return [];
              return [{ ...destination, capturedPositionId: capturedPiece.id }];
            });
          }
          if (rule.type === 'step') {
            if (rule.captureBehavior === 'capture-only') {
              warnings.push(`${pieceDefinition.displayName || pieceDefinition.name} has capture-only Step movement. Step captures are coming later.`);
              return [];
            }
            const maxDistance = Math.max(1, rule.maxDistance || 1);
            const directions = rule.directions.toLowerCase();
            const deltas: Array<{ row: number; col: number }> = [];
            if (directions.includes('forward') && directions.includes('diagonal')) {
              deltas.push({ row: forwardDirection, col: -1 }, { row: forwardDirection, col: 1 });
            } else if (directions.includes('all') && directions.includes('diagonal')) {
              deltas.push({ row: -1, col: -1 }, { row: -1, col: 1 }, { row: 1, col: -1 }, { row: 1, col: 1 });
            } else if (directions.includes('diagonal')) {
              deltas.push({ row: -1, col: -1 }, { row: -1, col: 1 }, { row: 1, col: -1 }, { row: 1, col: 1 });
            } else if (directions.includes('orthogonal')) {
              deltas.push({ row: -1, col: 0 }, { row: 1, col: 0 }, { row: 0, col: -1 }, { row: 0, col: 1 });
            } else {
              warnings.push(`${pieceDefinition.displayName || pieceDefinition.name} has Step directions that are not previewed yet.`);
            }
            return deltas.flatMap(delta =>
              Array.from({ length: maxDistance }, (_, index) => ({
                row: setupPiece.row + delta.row * (index + 1),
                col: setupPiece.col + delta.col * (index + 1)
              }))
            );
          }
          return [];
        }).filter(move =>
          move.row >= 0 &&
          move.row < sandboxRuleset.boardHeight &&
          move.col >= 0 &&
          move.col < sandboxRuleset.boardWidth &&
          !activeSetup.some(position => position.row === move.row && position.col === move.col)
        );
    };
    const currentTurnPieces = activeSetup.filter(position => position.teamId === currentTurnTeamId);
    const currentTurnCaptureMoves = currentTurnPieces.flatMap(position =>
      getMovesForPiece(position).filter(move => Boolean(move.capturedPositionId))
    );
    const legalPreviewWarnings: string[] = [];
    const rawLegalPreviewMoves = selectedSetupPiece ? getMovesForPiece(selectedSetupPiece, legalPreviewWarnings) : [];
    const forcedCaptureBlocking = sandboxRuleset.forcedCaptures && currentTurnCaptureMoves.length > 0;
    const legalPreviewMoves = rawLegalPreviewMoves.filter(move =>
      (!forcedCaptureBlocking || Boolean(move.capturedPositionId)) &&
      (!multiJumpPieceId || move.capturedPositionId)
    );
    if (selectedSetupPiece && forcedCaptureBlocking && rawLegalPreviewMoves.some(move => !move.capturedPositionId)) {
      legalPreviewWarnings.push('Forced capture is on. Non-capture moves are blocked while a capture is available.');
    }
    if (selectedSetupPiece && multiJumpPieceId) {
      legalPreviewWarnings.push('Multi-jump is active. Continue with the same piece until no jump captures remain.');
    }
    const legalDestinationKeys = new Set(legalPreviewMoves.map(move => `${move.row},${move.col}`));
    const getPromotedPieceId = (piece: StartingPosition, row: number) => {
      const rule = (sandboxRuleset.promotionRules ?? []).find(promotionRule =>
        promotionRule.sourcePieceId === piece.pieceId &&
        promotionRule.condition === 'team-relative-last-row'
      );
      if (!rule) return piece.pieceId;
      const teamIndex = sandboxRuleset.teams.findIndex(team => team.id === piece.teamId);
      const promotionRow = teamIndex <= 0 ? 0 : sandboxRuleset.boardHeight - 1;
      return row === promotionRow ? rule.targetPieceId : piece.pieceId;
    };
    const getWinnerMessage = (winnerTeamId: string) => {
      const winner = sandboxRuleset.teams.find(team => team.id === winnerTeamId);
      return `${winner?.name ?? winnerTeamId} wins in the sandbox.`;
    };
    const evaluateSandboxWin = (board: StartingPosition[], nextTeamId: string, winnerTeamId: string) => {
      const opponentPieces = board.filter(position => position.teamId === nextTeamId);
      if ((sandboxRuleset.winConditions ?? []).some(condition => condition.type === 'eliminate-opponent-pieces') && opponentPieces.length === 0) {
        return getWinnerMessage(winnerTeamId);
      }
      if ((sandboxRuleset.winConditions ?? []).some(condition => condition.type === 'opponent-no-legal-moves')) {
        const hasLegalMove = opponentPieces.some(position => getMovesForBoardPiece(position, board).length > 0);
        if (!hasLegalMove) return getWinnerMessage(winnerTeamId);
      }
      return null;
    };
    const getMovesForBoardPiece = (piece: StartingPosition, board: StartingPosition[]): TestMove[] => {
      const previousActiveSetup = activeSetup;
      void previousActiveSetup;
      const pieceDefinition = (sandboxRuleset.pieces ?? []).find(definition => definition.id === piece.pieceId);
      if (!pieceDefinition) return [];
      const teamIndex = sandboxRuleset.teams.findIndex(team => team.id === piece.teamId);
      const boardForward = teamIndex <= 0 ? -1 : 1;
      return (pieceDefinition.movementRules ?? []).flatMap(rule => {
        if (rule.type === 'ray') return [];
        if (rule.type === 'jump') {
          return parseRuleOffsets(rule.offsets).flatMap(offset => {
            const destination = { row: piece.row + offset.row, col: piece.col + offset.col };
            if (destination.row < 0 || destination.row >= sandboxRuleset.boardHeight || destination.col < 0 || destination.col >= sandboxRuleset.boardWidth) return [];
            if (board.some(position => position.row === destination.row && position.col === destination.col)) return [];
            if ((rule.captureMethod ?? 'normal') !== 'jump') return [{ ...destination }];
            const capturedOffset = parseRuleOffsets(rule.capturedPieceOffset ?? '')[0];
            if (!capturedOffset) return [];
            const capturedPiece = board.find(position => position.row === piece.row + capturedOffset.row && position.col === piece.col + capturedOffset.col);
            if (!capturedPiece || capturedPiece.teamId === piece.teamId) return [];
            return [{ ...destination, capturedPositionId: capturedPiece.id }];
          });
        }
        if (rule.type === 'step') {
          if (rule.captureBehavior === 'capture-only') return [];
          const directions = rule.directions.toLowerCase();
          const deltas: Array<{ row: number; col: number }> = [];
          if (directions.includes('forward') && directions.includes('diagonal')) deltas.push({ row: boardForward, col: -1 }, { row: boardForward, col: 1 });
          else if (directions.includes('diagonal')) deltas.push({ row: -1, col: -1 }, { row: -1, col: 1 }, { row: 1, col: -1 }, { row: 1, col: 1 });
          else if (directions.includes('orthogonal')) deltas.push({ row: -1, col: 0 }, { row: 1, col: 0 }, { row: 0, col: -1 }, { row: 0, col: 1 });
          const maxDistance = Math.max(1, rule.maxDistance || 1);
          return deltas.flatMap(delta =>
            Array.from({ length: maxDistance }, (_, index) => ({ row: piece.row + delta.row * (index + 1), col: piece.col + delta.col * (index + 1) }))
          ).filter(destination =>
            destination.row >= 0 &&
            destination.row < sandboxRuleset.boardHeight &&
            destination.col >= 0 &&
            destination.col < sandboxRuleset.boardWidth &&
            !board.some(position => position.row === destination.row && position.col === destination.col)
          );
        }
        return [];
      });
    };

    const executeTestMove = (move: TestMove) => {
      if (!selectedSetupPiece || testResult) return;
      setTestBoardSetup(current => {
        let movedPieceId = selectedSetupPiece.pieceId;
        movedPieceId = getPromotedPieceId(selectedSetupPiece, move.row);
        const nextBoard = current
          .filter(position => position.id !== move.capturedPositionId)
          .map(position =>
            position.id === selectedSetupPiece.id
              ? { ...position, row: move.row, col: move.col, pieceId: movedPieceId }
              : position
          );
        const movedPiece = nextBoard.find(position => position.id === selectedSetupPiece.id);
        const additionalJumps = movedPiece && sandboxRuleset.multiJump
          ? getMovesForBoardPiece(movedPiece, nextBoard).filter(nextMove => Boolean(nextMove.capturedPositionId))
          : [];
        if (move.capturedPositionId && additionalJumps.length > 0) {
          setMultiJumpPieceId(selectedSetupPiece.id);
          setSelectedTestSquare({ row: move.row, col: move.col });
          setTestMessage('Jump capture applied. Continue the multi-jump with the same piece.');
          return nextBoard;
        }
        const nextTurnIndex = testTurnIndex + 1;
        const nextTeamId = turnTeamIds[nextTurnIndex % Math.max(1, turnTeamIds.length)] ?? '';
        setMultiJumpPieceId(null);
        setSelectedTestSquare(null);
        setTestTurnIndex(nextTurnIndex);
        setTestResult(evaluateSandboxWin(nextBoard, nextTeamId, selectedSetupPiece.teamId));
        setTestMessage(movedPieceId !== selectedSetupPiece.pieceId ? 'Move applied and piece promoted in the sandbox.' : move.capturedPositionId ? 'Jump capture applied in the sandbox.' : 'Move applied in the sandbox.');
        return nextBoard;
      });
    };

    return (
      <div className="view-container cu-view-shell">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '1rem' }}>{sandboxMode === 'test-play' ? 'Rule Test Play' : 'Rule Test Sandbox'}</h3>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              {sandboxMode === 'test-play'
                ? 'Select a starting piece, then choose a highlighted destination. Moves stay inside this sandbox.'
                : 'This sandbox previews the draft only. It does not affect the live game or Standard Chess.'}
            </div>
          </div>

          <section style={{ padding: '12px', border: '1px solid #d0d7de', borderRadius: 8, background: '#fff' }}>
            <div style={{ fontWeight: 700, color: '#2c3e50' }}>{sandboxRuleset.name}</div>
            <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#64748b' }}>
              {sandboxRuleset.boardWidth} x {sandboxRuleset.boardHeight} board preview
            </div>
            <div style={{ marginTop: '6px', fontSize: '0.72rem', color: '#475569' }}>
              Forced captures: {(sandboxRuleset.forcedCaptures ?? false) ? 'On' : 'Off'} - Multi-jump: {(sandboxRuleset.multiJump ?? false) ? 'On' : 'Off'}
            </div>
            <div style={{ marginTop: '4px', fontSize: '0.72rem', color: '#475569' }}>
              {sandboxMode === 'test-play'
                ? `Current turn: ${currentTurnTeam?.name ?? 'Not set'}`
                : `First move: ${sandboxRuleset.teams.find(team => team.id === (sandboxRuleset.turnOrder?.teamIds ?? [])[0])?.name ?? 'Not set'}`}
            </div>
          </section>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns.length}, minmax(10px, 1fr))`,
              width: 'min(100%, 320px)',
              aspectRatio: `${sandboxRuleset.boardWidth} / ${sandboxRuleset.boardHeight}`,
              border: '2px solid #334155',
              alignSelf: 'center',
              background: '#fff'
            }}
          >
            {cells.map((_, index) => {
              const row = Math.floor(index / sandboxRuleset.boardWidth);
              const col = index % sandboxRuleset.boardWidth;
              const isDark = (row + col) % 2 === 1;
              const setupPiece = activeSetup.find(position => position.row === row && position.col === col);
              const isSelected = selectedTestSquare?.row === row && selectedTestSquare.col === col;
              const isLegalPreview = legalDestinationKeys.has(`${row},${col}`);
              const setupTeam = setupPiece ? sandboxRuleset.teams.find(team => team.id === setupPiece.teamId) : null;
              const setupDefinition = setupPiece ? sandboxRuleset.pieces.find(piece => piece.id === setupPiece.pieceId) : null;
              const setupLabel = setupPiece
                ? `${setupTeam?.name?.slice(0, 1) ?? '?'}${setupDefinition?.displayName?.slice(0, 1) ?? setupDefinition?.name?.slice(0, 1) ?? '?'}`
                : '';
              return (
                <div
                  key={`${row}-${col}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isSelected ? '#fde68a' : isLegalPreview ? '#bbf7d0' : isDark ? '#94a3b8' : '#f8fafc',
                    border: isSelected ? '2px solid #b45309' : isLegalPreview ? '2px solid #16a34a' : '1px solid rgba(15, 23, 42, 0.08)',
                    color: '#0f172a',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    cursor: sandboxMode === 'test-play' && (setupPiece || isLegalPreview) ? 'pointer' : 'default'
                  }}
                  onClick={() => {
                    if (sandboxMode !== 'test-play') return;
                    if (testResult) {
                      setTestMessage('The sandbox game is complete. Reset the test board to continue.');
                      return;
                    }
                    const move = legalPreviewMoves.find(destination => destination.row === row && destination.col === col);
                    if (move) {
                      executeTestMove(move);
                      return;
                    }
                    if (!setupPiece) return;
                    if (multiJumpPieceId && setupPiece.id !== multiJumpPieceId) {
                      setTestMessage('Multi-jump is active. Continue with the same piece.');
                      return;
                    }
                    if (setupPiece.teamId !== currentTurnTeamId) {
                      setTestMessage('That piece is not on the current turn.');
                      return;
                    }
                    setSelectedTestSquare({ row, col });
                    setTestMessage('Select a highlighted destination to move.');
                  }}
                  title={setupPiece ? getStartingPositionSummary(setupPiece, sandboxRuleset.teams, sandboxRuleset.pieces ?? []) : undefined}
                >
                  {setupLabel}
                </div>
              );
            })}
          </div>

          {sandboxMode === 'test-play' && (
            <section style={{ padding: '12px', border: '1px solid #d0d7de', borderRadius: 8, background: '#f8fafc' }}>
              <div style={{ fontWeight: 700, color: '#2c3e50', marginBottom: '6px' }}>Legal Move Preview</div>
              {selectedSetupPiece && selectedPieceDefinition ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ fontSize: '0.74rem', color: '#475569' }}>
                    Selected: {getStartingPositionSummary(selectedSetupPiece, sandboxRuleset.teams, sandboxRuleset.pieces ?? [])}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#475569' }}>
                    Basic destinations: {legalPreviewMoves.length || 'None previewed'}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#475569' }}>
                    Current turn: {currentTurnTeam?.name ?? 'Not set'}
                  </div>
                  {testResult && (
                    <div style={{ fontSize: '0.76rem', color: '#166534', fontWeight: 700 }}>{testResult}</div>
                  )}
                  {multiJumpPieceId && !testResult && (
                    <div style={{ fontSize: '0.74rem', color: '#9a3412' }}>Multi-jump in progress.</div>
                  )}
                  {testMessage && (
                    <div style={{ fontSize: '0.72rem', color: '#334155' }}>{testMessage}</div>
                  )}
                  {legalPreviewWarnings.map(warning => (
                    <div key={warning} style={{ fontSize: '0.7rem', color: '#9a3412' }}>{warning}</div>
                  ))}
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    Step, supported Jump captures, promotion, forced capture, multi-jump, and basic win detection run locally here.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {testResult && (
                    <div style={{ fontSize: '0.76rem', color: '#166534', fontWeight: 700 }}>{testResult}</div>
                  )}
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Select a {currentTurnTeam?.name ?? 'current turn'} piece on the grid.</div>
                  {testMessage && <div style={{ fontSize: '0.72rem', color: '#334155' }}>{testMessage}</div>}
                </div>
              )}
            </section>
          )}

          <section style={{ padding: '12px', border: '1px solid #d0d7de', borderRadius: 8, background: '#f8fafc' }}>
            <div style={{ fontWeight: 700, color: '#2c3e50', marginBottom: '6px' }}>Teams</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {sandboxRuleset.teams.map(team => (
                <span key={team.id} style={{ padding: '4px 8px', borderRadius: 999, background: '#e2e8f0', color: '#334155', fontSize: '0.72rem', fontWeight: 700 }}>
                  {team.name}
                </span>
              ))}
            </div>
          </section>

          <section style={{ padding: '12px', border: '1px solid #d0d7de', borderRadius: 8, background: '#f8fafc' }}>
            <div style={{ fontWeight: 700, color: '#2c3e50', marginBottom: '6px' }}>Turn Order</div>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
              {getTurnOrderSummary(sandboxRuleset.turnOrder, sandboxRuleset.teams)}
            </div>
          </section>

          <section style={{ padding: '12px', border: '1px solid #d0d7de', borderRadius: 8, background: '#f8fafc' }}>
            <div style={{ fontWeight: 700, color: '#2c3e50', marginBottom: '6px' }}>Starting Setup</div>
            {activeSetup.length === 0 ? (
              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>No starting pieces added yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: 140, overflow: 'auto' }}>
                {activeSetup.map(position => (
                  <div key={position.id} style={{ color: '#64748b', fontSize: '0.68rem' }}>
                    {getStartingPositionSummary(position, sandboxRuleset.teams, sandboxRuleset.pieces ?? [])}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={{ padding: '12px', border: '1px solid #d0d7de', borderRadius: 8, background: '#f8fafc' }}>
            <div style={{ fontWeight: 700, color: '#2c3e50', marginBottom: '6px' }}>Pieces</div>
            {(sandboxRuleset.pieces ?? []).length === 0 ? (
              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>No piece definitions added yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(sandboxRuleset.pieces ?? []).map(piece => (
                  <div key={piece.id} style={{ padding: '8px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff' }}>
                    <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.78rem' }}>{piece.displayName || piece.name || piece.id}</div>
                    <div style={{ color: '#64748b', fontSize: '0.68rem' }}>ID: {piece.id}</div>
                    <div style={{ color: '#64748b', fontSize: '0.68rem' }}>Teams: {piece.teamAvailability.join(', ') || 'None'}</div>
                    {(piece.movementRules ?? []).map(rule => (
                      <div key={rule.id} style={{ color: '#64748b', fontSize: '0.68rem' }}>
                        {getMovementRuleSummary(rule)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={{ padding: '12px', border: '1px solid #d0d7de', borderRadius: 8, background: '#f8fafc' }}>
            <div style={{ fontWeight: 700, color: '#2c3e50', marginBottom: '6px' }}>Promotions</div>
            {(sandboxRuleset.promotionRules ?? []).length === 0 ? (
              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>No promotion rules added yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {(sandboxRuleset.promotionRules ?? []).map(rule => (
                  <div key={rule.id} style={{ color: '#64748b', fontSize: '0.7rem' }}>
                    {getPromotionRuleSummary(rule, sandboxRuleset.pieces ?? [])}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={{ padding: '12px', border: '1px solid #d0d7de', borderRadius: 8, background: '#f8fafc' }}>
            <div style={{ fontWeight: 700, color: '#2c3e50', marginBottom: '6px' }}>Win Conditions</div>
            {(sandboxRuleset.winConditions ?? []).length === 0 ? (
              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>No win conditions added yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {(sandboxRuleset.winConditions ?? []).map(condition => (
                  <div key={condition.id} style={{ color: '#64748b', fontSize: '0.7rem' }}>
                    {getWinConditionSummary(condition, sandboxRuleset.pieces ?? [])}
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: '6px', fontSize: '0.68rem', color: '#64748b' }}>
              Checkers completeness: {(sandboxRuleset.pieces ?? []).some(piece => piece.id === 'checker') && (sandboxRuleset.pieces ?? []).some(piece => piece.id === 'king') && (sandboxRuleset.promotionRules ?? []).length > 0 && (sandboxRuleset.winConditions ?? []).length > 0 ? 'Ready as metadata preview' : 'Missing one or more Checkers metadata pieces'}
            </div>
          </section>

          {sandboxValidation && (
            <div style={{ padding: '9px', borderRadius: 6, border: `1px solid ${sandboxValidation.valid ? '#86efac' : '#fecaca'}`, background: sandboxValidation.valid ? '#f0fdf4' : '#fef2f2', color: sandboxValidation.valid ? '#166534' : '#991b1b', fontSize: '0.74rem' }}>
              {sandboxValidation.messages.map(message => <div key={message}>{message}</div>)}
            </div>
          )}

          <section style={{ padding: '12px', border: '1px solid #d0d7de', borderRadius: 8, background: '#f8fafc' }}>
            <div style={{ fontWeight: 700, color: '#2c3e50', marginBottom: '6px' }}>Readiness Checklist</div>
            {[
              ['Board size', sandboxRuleset.boardWidth > 0 && sandboxRuleset.boardHeight > 0],
              ['Teams', sandboxRuleset.teams.length >= 2],
              ['Pieces', (sandboxRuleset.pieces ?? []).length > 0],
              ['Movement', (sandboxRuleset.pieces ?? []).some(piece => (piece.movementRules ?? []).length > 0)],
              ['Setup', activeSetup.length > 0],
              ['Promotion', (sandboxRuleset.promotionRules ?? []).length > 0],
              ['Win condition', (sandboxRuleset.winConditions ?? []).length > 0],
              ['Turn order', (sandboxRuleset.turnOrder?.teamIds ?? []).length > 0],
              ['Move execution', sandboxMode === 'test-play'],
              ['Captures', (sandboxRuleset.pieces ?? []).some(piece => (piece.movementRules ?? []).some(rule => rule.captureMethod === 'jump'))],
              ['Forced capture', Boolean(sandboxRuleset.forcedCaptures)],
              ['Multi-jump', Boolean(sandboxRuleset.multiJump)],
              ['Win detection', (sandboxRuleset.winConditions ?? []).some(condition => condition.type === 'eliminate-opponent-pieces' || condition.type === 'opponent-no-legal-moves')]
            ].map(([label, ready]) => (
              <div key={String(label)} style={{ fontSize: '0.7rem', color: ready ? '#166534' : '#991b1b' }}>
                {ready ? 'Ready' : 'Needs work'}: {label}
              </div>
            ))}
            <div style={{ marginTop: '6px', fontSize: '0.72rem', color: sandboxValidation?.valid && sandboxMode === 'test-play' ? '#166534' : '#64748b', fontWeight: 700 }}>
              {sandboxValidation?.valid && sandboxMode === 'test-play' ? 'Sandbox playable' : 'Sandbox preview only'}
            </div>
          </section>

          <div style={{ padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff7ed', color: '#9a3412', fontSize: '0.74rem' }}>
            Movement testing is coming later.
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => {
              setSandboxRulesetId(null);
              setSelectedTestSquare(null);
              setTestBoardSetup([]);
              setTestTurnIndex(0);
              setTestMessage(null);
            }} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>
              Back to Builder
            </button>
            <button type="button" onClick={() => {
              setSelectedTestSquare(null);
              setTestBoardSetup((sandboxRuleset.startingSetup ?? []).map(position => ({ ...position })));
              setTestTurnIndex(0);
              setTestMessage(sandboxMode === 'test-play' ? 'Test board reset to the starting setup.' : null);
              setTestResult(null);
              setMultiJumpPieceId(null);
              setSandboxRulesetId(sandboxRuleset.id);
            }} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>
              {sandboxMode === 'test-play' ? 'Reset Test Board' : 'Reset Test'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="view-container cu-view-shell">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <input id="rule-builder-import-file" type="file" accept=".json,application/json" onChange={importRulesetFile} style={{ display: 'none' }} />
        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
          Create, test, approve, save, and manage custom game rulesets.
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setShowCreateChoices(!showCreateChoices)} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #2c3e50', background: '#2c3e50', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
            Create New Custom Game
          </button>
          <label htmlFor="rule-builder-import-file" style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>
            Load Custom Game
          </label>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '0.68rem', color: '#64748b' }}>
          {['Create', 'Edit', 'Validate', 'Test', 'Approve', 'Save / Export', 'Play'].map(step => (
            <span key={step} style={{ padding: '3px 7px', borderRadius: 999, border: '1px solid #e2e8f0', background: '#fff' }}>{step}</span>
          ))}
        </div>

        {showCreateChoices && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '9px', padding: '12px', border: '1px solid #d0d7de', borderRadius: 8, background: '#f8fafc' }}>
            <div>
              <div style={{ fontSize: '0.82rem', color: '#2c3e50', fontWeight: 700 }}>Choose a Starting Point</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Start fresh or create an editable copy from existing rule metadata.</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" onClick={createNew} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                Start Blank
              </button>
              <button type="button" onClick={duplicateStandard} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                Load Standard Chess Rules
              </button>
              <button type="button" onClick={loadCheckersTemplate} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                Load Checkers Template
              </button>
              <label htmlFor="rule-builder-import-file" style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                Import Custom Game
              </label>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
              Loading Standard Chess rules creates a custom copy. It does not change the built-in Chess game.
            </div>
          </section>
        )}

        {importError && (
          <div style={{ padding: '9px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', fontSize: '0.74rem' }}>
            {importError}
          </div>
        )}

        {importPreview && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', border: '1px solid #d0d7de', borderRadius: 8, background: '#f8fafc' }}>
            <div>
              <div style={{ fontSize: '0.82rem', color: '#2c3e50', fontWeight: 700 }}>Preview Custom Game</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Source: {importPreview.sourceName}</div>
            </div>
            {(() => {
              const importReadiness = getRulesetReadiness(importPreview.ruleset);
              return (
                <div style={{ alignSelf: 'flex-start', padding: '4px 7px', borderRadius: 999, border: `1px solid ${importReadiness.border}`, background: importReadiness.background, color: importReadiness.color, fontSize: '0.68rem', fontWeight: 800 }}>
                  {importReadiness.label}
                </div>
              );
            })()}
            <div style={{ fontSize: '0.74rem', color: '#475569' }}>Name: {importPreview.ruleset.name || 'Untitled Custom Game'}</div>
            <div style={{ fontSize: '0.74rem', color: '#475569' }}>Board: {importPreview.ruleset.boardWidth} x {importPreview.ruleset.boardHeight}</div>
            <div style={{ fontSize: '0.74rem', color: '#475569' }}>Teams: {importPreview.ruleset.teams.map(team => team.name).join(', ') || 'None'}</div>
            <div style={{ fontSize: '0.74rem', color: '#475569' }}>Pieces: {(importPreview.ruleset.pieces ?? []).length}</div>
            <div style={{ fontSize: '0.74rem', color: '#475569' }}>
              Win conditions: {(importPreview.ruleset.winConditions ?? []).map(condition => getWinConditionSummary(condition, importPreview.ruleset.pieces ?? [])).join('; ') || 'None'}
            </div>
            <div style={{ padding: '8px', borderRadius: 6, border: `1px solid ${importPreview.validation.valid ? '#86efac' : '#fecaca'}`, background: importPreview.validation.valid ? '#f0fdf4' : '#fef2f2', color: importPreview.validation.valid ? '#166534' : '#991b1b', fontSize: '0.72rem' }}>
              {importPreview.validation.messages.map(message => <div key={message}>{message}</div>)}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Imported custom games become editable drafts first. Approve them after review to make them available in Let&apos;s Play.
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" onClick={applyImportedRuleset} disabled={!importPreview.validation.valid} style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #2c3e50', background: importPreview.validation.valid ? '#2c3e50' : '#94a3b8', color: '#fff', cursor: importPreview.validation.valid ? 'pointer' : 'not-allowed', fontWeight: 700 }}>
                Add as Editable Draft
              </button>
              <button type="button" onClick={() => setImportPreview(null)} style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                Cancel
              </button>
            </div>
          </section>
        )}

        <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2c3e50' }}>Custom Rulesets</div>
          {settings.customRulesets.length === 0 ? (
            <div style={{ fontSize: '0.75rem', color: '#64748b', padding: '10px', border: '1px dashed #cbd5e1', borderRadius: 8 }}>
              No custom rulesets yet. Create a blank draft or duplicate Standard Chess.
            </div>
          ) : (
            settings.customRulesets.map(ruleset => {
              const readiness = getRulesetReadiness(ruleset);
              return (
                <button
                  key={ruleset.id}
                  type="button"
                  onClick={() => {
                    setSelectedRulesetId(ruleset.id);
                    setRuleBuilderLayer('simple');
                  }}
                  style={{
                    padding: '10px',
                    borderRadius: 8,
                    border: selectedRulesetId === ruleset.id ? '2px solid #2c3e50' : '1px solid #d0d7de',
                    background: '#fff',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: 700 }}>{ruleset.name || 'Untitled Custom Game'}</span>
                    <span style={{ fontSize: '0.68rem', color: '#475569' }}>{statusLabels[ruleset.status]}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px', alignItems: 'center' }}>
                    <span style={{ padding: '3px 6px', borderRadius: 999, border: `1px solid ${readiness.border}`, background: readiness.background, color: readiness.color, fontSize: '0.66rem', fontWeight: 800 }}>
                      {readiness.label}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {ruleset.boardWidth} x {ruleset.boardHeight} - {ruleset.teams.length} teams
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </section>

        {selectedRuleset && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', border: '1px solid #d0d7de', borderRadius: 8, background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#2c3e50' }}>{selectedRuleset.name || 'Untitled Custom Game'}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Simple setup first, advanced rules second, system checks last. Editing an approved game returns it to Draft for review.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => duplicateRuleset(selectedRuleset)} style={{ padding: '6px 9px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                  Duplicate
                </button>
                <button type="button" onClick={() => setPendingDeleteRulesetId(selectedRuleset.id)} style={{ padding: '6px 9px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff', color: '#991b1b', cursor: 'pointer', fontWeight: 700 }}>
                  Delete
                </button>
                {ruleBuilderLayer !== 'simple' && (
                  <button type="button" onClick={goBackLayer} style={{ padding: '6px 9px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                    Back
                  </button>
                )}
              </div>
            </div>

            {pendingDeleteRulesetId === selectedRuleset.id && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700 }}>
                  Delete "{selectedRuleset.name || 'Untitled Custom Game'}"? This cannot be undone.
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => confirmDeleteRuleset(selectedRuleset.id)} style={{ padding: '6px 9px', borderRadius: 6, border: '1px solid #991b1b', background: '#991b1b', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                    Delete Custom Game
                  </button>
                  <button type="button" onClick={() => setPendingDeleteRulesetId(null)} style={{ padding: '6px 9px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', color: '#334155', cursor: 'pointer', fontWeight: 700 }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(['simple', 'advanced', 'system'] as RuleBuilderLayer[]).map(layer => (
                <button
                  key={layer}
                  type="button"
                  onClick={() => setRuleBuilderLayer(layer)}
                  style={{
                    padding: '6px 9px',
                    borderRadius: 6,
                    border: ruleBuilderLayer === layer ? '1px solid #2c3e50' : '1px solid #d0d7de',
                    background: ruleBuilderLayer === layer ? '#2c3e50' : '#fff',
                    color: ruleBuilderLayer === layer ? '#fff' : '#334155',
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                >
                  {layerLabels[layer]}
                </button>
              ))}
            </div>

            {ruleBuilderLayer === 'simple' && (
              <>
                <div>
                  <div style={{ fontWeight: 700, color: '#2c3e50' }}>Basic Setup</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Name the game, choose the board size, and define the teams.</div>
                </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.74rem', color: '#475569', fontWeight: 700 }}>
              Name
              <input value={selectedRuleset.name} onChange={event => updateSelectedRuleset({ name: event.target.value })} style={{ padding: '7px', border: '1px solid #d0d7de', borderRadius: 6 }} />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.74rem', color: '#475569', fontWeight: 700 }}>
              Description
              <textarea value={selectedRuleset.description} onChange={event => updateSelectedRuleset({ description: event.target.value })} rows={3} style={{ padding: '7px', border: '1px solid #d0d7de', borderRadius: 6, resize: 'vertical' }} />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.74rem', color: '#475569', fontWeight: 700 }}>
                Board Width
                <input type="number" min="1" max="32" value={selectedRuleset.boardWidth} onChange={event => updateSelectedRuleset({ boardWidth: Number(event.target.value) })} style={{ padding: '7px', border: '1px solid #d0d7de', borderRadius: 6 }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.74rem', color: '#475569', fontWeight: 700 }}>
                Board Height
                <input type="number" min="1" max="32" value={selectedRuleset.boardHeight} onChange={event => updateSelectedRuleset({ boardHeight: Number(event.target.value) })} style={{ padding: '7px', border: '1px solid #d0d7de', borderRadius: 6 }} />
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 700 }}>Teams</div>
              {selectedRuleset.teams.map((team, index) => (
                <input
                  key={team.id}
                  value={team.name}
                  onChange={event => updateTeamName(index, event.target.value)}
                  style={{ padding: '7px', border: '1px solid #d0d7de', borderRadius: 6 }}
                />
              ))}
            </div>
              </>
            )}

            {ruleBuilderLayer === 'advanced' && (
              <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '9px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: '#2c3e50', fontWeight: 700 }}>Capture Rules</div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Checkers-style capture rules can be described here, but they do not affect live gameplay yet.</div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#475569', fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={selectedRuleset.forcedCaptures ?? false}
                  onChange={event => updateSelectedRuleset({ forcedCaptures: event.target.checked })}
                />
                Forced captures
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#475569', fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={selectedRuleset.multiJump ?? false}
                  onChange={event => updateSelectedRuleset({ multiJump: event.target.checked })}
                />
                Multi-jump
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.82rem', color: '#2c3e50', fontWeight: 700 }}>Turn Order</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Choose who moves first and the repeating turn sequence.</div>
                </div>
                <button type="button" onClick={resetTurnOrderFromTeams} style={{ padding: '6px 9px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                  Use Team Order
                </button>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#475569' }}>
                Current sequence: {getTurnOrderSummary(selectedRuleset.turnOrder, selectedRuleset.teams)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
                {(selectedRuleset.turnOrder?.teamIds ?? selectedRuleset.teams.map(team => team.id)).map((teamId, orderIndex) => (
                  <label key={`${teamId}-${orderIndex}`} style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: '#475569', fontWeight: 700 }}>
                    {orderIndex === 0 ? 'Who moves first?' : `Turn ${orderIndex + 1}`}
                    <select value={teamId} onChange={event => updateTurnOrderTeam(orderIndex, event.target.value)} style={{ padding: '6px', border: '1px solid #d0d7de', borderRadius: 6 }}>
                      <option value="">Choose team</option>
                      {selectedRuleset.teams.map(team => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.82rem', color: '#2c3e50', fontWeight: 700 }}>Starting Setup</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Choose a team and piece, then click the setup board to place it. Click an occupied square to remove it. Row and column start at 1.</div>
                </div>
                <button
                  type="button"
                  onClick={addStartingPosition}
                  disabled={selectedRuleset.teams.length === 0 || getSelectedPieces().length === 0}
                  style={{ padding: '6px 9px', borderRadius: 6, border: '1px solid #d0d7de', background: selectedRuleset.teams.length === 0 || getSelectedPieces().length === 0 ? '#f8fafc' : '#fff', cursor: selectedRuleset.teams.length === 0 || getSelectedPieces().length === 0 ? 'not-allowed' : 'pointer', fontWeight: 700 }}
                >
                  Add Starting Piece
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', padding: '9px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.68rem', color: '#475569', fontWeight: 700 }}>
                  Placement Team
                  <select value={setupBrush.teamId || selectedRuleset.teams[0]?.id || ''} onChange={event => setSetupBrush(current => ({ ...current, teamId: event.target.value }))} style={{ padding: '6px', border: '1px solid #d0d7de', borderRadius: 6 }}>
                    <option value="">Choose team</option>
                    {selectedRuleset.teams.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.68rem', color: '#475569', fontWeight: 700 }}>
                  Placement Piece
                  <select value={setupBrush.pieceId || getSelectedPieces()[0]?.id || ''} onChange={event => setSetupBrush(current => ({ ...current, pieceId: event.target.value }))} style={{ padding: '6px', border: '1px solid #d0d7de', borderRadius: 6 }}>
                    <option value="">Choose piece</option>
                    {getSelectedPieces().map(piece => (
                      <option key={piece.id} value={piece.id}>{piece.displayName || piece.name || piece.id}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${Math.max(1, selectedRuleset.boardWidth)}, minmax(22px, 1fr))`,
                  width: 'min(100%, 360px)',
                  aspectRatio: `${Math.max(1, selectedRuleset.boardWidth)} / ${Math.max(1, selectedRuleset.boardHeight)}`,
                  border: '1px solid #334155',
                  background: '#fff'
                }}
              >
                {Array.from({ length: Math.max(1, selectedRuleset.boardWidth * selectedRuleset.boardHeight) }, (_, index) => {
                  const row = Math.floor(index / Math.max(1, selectedRuleset.boardWidth));
                  const col = index % Math.max(1, selectedRuleset.boardWidth);
                  const setupPiece = (selectedRuleset.startingSetup ?? []).find(position => position.row === row && position.col === col);
                  const team = setupPiece ? selectedRuleset.teams.find(item => item.id === setupPiece.teamId) : null;
                  const piece = setupPiece ? getSelectedPieces().find(item => item.id === setupPiece.pieceId) : null;
                  return (
                    <button
                      key={`setup-grid-${row}-${col}`}
                      type="button"
                      onClick={() => toggleStartingSquare(row, col)}
                      title={setupPiece ? `Remove ${team?.name || setupPiece.teamId} ${piece?.displayName || piece?.name || setupPiece.pieceId}` : 'Place starting piece'}
                      style={{
                        border: '1px solid rgba(15,23,42,0.12)',
                        background: setupPiece ? '#dbeafe' : (row + col) % 2 === 1 ? '#94a3b8' : '#f8fafc',
                        color: '#0f172a',
                        fontSize: '0.62rem',
                        fontWeight: 900,
                        cursor: setupBrush.teamId || selectedRuleset.teams[0]?.id ? 'pointer' : 'not-allowed'
                      }}
                    >
                      {setupPiece ? `${team?.name?.slice(0, 1) ?? '?'}${piece?.displayName?.slice(0, 1) ?? '?'}` : ''}
                    </button>
                  );
                })}
              </div>
              {(selectedRuleset.startingSetup ?? []).length === 0 ? (
                <div style={{ fontSize: '0.74rem', color: '#64748b', padding: '8px', border: '1px dashed #cbd5e1', borderRadius: 6 }}>
                  No starting pieces yet. The Checkers template fills legal dark-square setup metadata automatically.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', maxHeight: 260, overflow: 'auto' }}>
                  {(selectedRuleset.startingSetup ?? []).map((position, positionIndex) => (
                    <div key={`${position.id}-${positionIndex}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 80px auto', gap: '6px', alignItems: 'end', padding: '8px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.68rem', color: '#475569', fontWeight: 700 }}>
                        Team
                        <select value={position.teamId} onChange={event => updateStartingPosition(positionIndex, { teamId: event.target.value })} style={{ padding: '6px', border: '1px solid #d0d7de', borderRadius: 6 }}>
                          <option value="">Choose team</option>
                          {selectedRuleset.teams.map(team => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                          ))}
                        </select>
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.68rem', color: '#475569', fontWeight: 700 }}>
                        Piece
                        <select value={position.pieceId} onChange={event => updateStartingPosition(positionIndex, { pieceId: event.target.value })} style={{ padding: '6px', border: '1px solid #d0d7de', borderRadius: 6 }}>
                          <option value="">Choose piece</option>
                          {getSelectedPieces().map(piece => (
                            <option key={piece.id} value={piece.id}>{piece.displayName || piece.name || piece.id}</option>
                          ))}
                        </select>
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.68rem', color: '#475569', fontWeight: 700 }}>
                        Row
                        <input type="number" min="1" max={selectedRuleset.boardHeight} value={position.row + 1} onChange={event => updateStartingPosition(positionIndex, { row: Number(event.target.value) - 1 })} style={{ padding: '6px', border: '1px solid #d0d7de', borderRadius: 6 }} />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.68rem', color: '#475569', fontWeight: 700 }}>
                        Column
                        <input type="number" min="1" max={selectedRuleset.boardWidth} value={position.col + 1} onChange={event => updateStartingPosition(positionIndex, { col: Number(event.target.value) - 1 })} style={{ padding: '6px', border: '1px solid #d0d7de', borderRadius: 6 }} />
                      </label>
                      <button type="button" onClick={() => removeStartingPosition(positionIndex)} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff', color: '#991b1b', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700 }}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.82rem', color: '#2c3e50', fontWeight: 700 }}>Pieces</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Add piece metadata and simple movement rules. Movement testing is coming later.</div>
                </div>
                <button type="button" onClick={addPiece} style={{ padding: '6px 9px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                  Add Piece
                </button>
              </div>

              {getSelectedPieces().length === 0 ? (
                <div style={{ fontSize: '0.74rem', color: '#64748b', padding: '8px', border: '1px dashed #cbd5e1', borderRadius: 6 }}>
                  No custom pieces defined yet.
                </div>
              ) : (
                getSelectedPieces().map((piece, pieceIndex) => (
                  <div key={`${piece.id}-${pieceIndex}`} style={{ display: 'flex', flexDirection: 'column', gap: '7px', padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <div style={{ fontWeight: 700, color: '#334155' }}>Edit Piece</div>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.72rem', color: '#475569', fontWeight: 700 }}>
                      Piece ID
                      <input value={piece.id} onChange={event => updatePiece(pieceIndex, { id: event.target.value })} style={{ padding: '6px', border: '1px solid #d0d7de', borderRadius: 6 }} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.72rem', color: '#475569', fontWeight: 700 }}>
                      Name
                      <input value={piece.name} onChange={event => updatePiece(pieceIndex, { name: event.target.value })} style={{ padding: '6px', border: '1px solid #d0d7de', borderRadius: 6 }} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.72rem', color: '#475569', fontWeight: 700 }}>
                      Display Name
                      <input value={piece.displayName} onChange={event => updatePiece(pieceIndex, { displayName: event.target.value })} style={{ padding: '6px', border: '1px solid #d0d7de', borderRadius: 6 }} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.72rem', color: '#475569', fontWeight: 700 }}>
                      Description
                      <textarea value={piece.description ?? ''} onChange={event => updatePiece(pieceIndex, { description: event.target.value })} rows={2} style={{ padding: '6px', border: '1px solid #d0d7de', borderRadius: 6, resize: 'vertical' }} />
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 700 }}>Team Availability</div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {selectedRuleset.teams.map(team => (
                          <label key={team.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#475569' }}>
                            <input
                              type="checkbox"
                              checked={piece.teamAvailability.includes(team.id)}
                              onChange={() => togglePieceTeam(pieceIndex, team.id)}
                            />
                            {team.name}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 700 }}>Movement Rules</div>
                        <button type="button" onClick={() => addMovementRule(pieceIndex)} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>
                          Add Movement
                        </button>
                      </div>
                      {(piece.movementRules ?? []).length === 0 ? (
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>No movement rules yet.</div>
                      ) : (
                        (piece.movementRules ?? []).map((rule, ruleIndex) => (
                          <div key={`${rule.id}-${ruleIndex}`} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff' }}>
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{getMovementRuleSummary(rule)}</div>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: '#475569', fontWeight: 700 }}>
                              Movement Type
                              <select value={rule.type} onChange={event => updateMovementRule(pieceIndex, ruleIndex, { type: event.target.value as MovementRule['type'] })} style={{ padding: '6px', border: '1px solid #d0d7de', borderRadius: 6 }}>
                                <option value="step">Step</option>
                                <option value="ray">Ray</option>
                                <option value="jump">Jump</option>
                              </select>
                            </label>
                            {rule.type === 'jump' ? (
                              <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: '#475569', fontWeight: 700 }}>
                                Offsets
                                <input value={rule.offsets} onChange={event => updateMovementRule(pieceIndex, ruleIndex, { offsets: event.target.value })} placeholder="1,2; -1,2" style={{ padding: '6px', border: '1px solid #d0d7de', borderRadius: 6 }} />
                              </label>
                            ) : (
                              <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: '#475569', fontWeight: 700 }}>
                                Directions
                                <input value={rule.directions} onChange={event => updateMovementRule(pieceIndex, ruleIndex, { directions: event.target.value })} placeholder="orthogonal, diagonal, forward" style={{ padding: '6px', border: '1px solid #d0d7de', borderRadius: 6 }} />
                              </label>
                            )}
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: '#475569', fontWeight: 700 }}>
                              Max Distance
                              <input type="number" min="1" max="32" value={rule.maxDistance} onChange={event => updateMovementRule(pieceIndex, ruleIndex, { maxDistance: Number(event.target.value) })} style={{ padding: '6px', border: '1px solid #d0d7de', borderRadius: 6 }} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: '#475569', fontWeight: 700 }}>
                              Capture Behavior
                              <select value={rule.captureBehavior} onChange={event => updateMovementRule(pieceIndex, ruleIndex, { captureBehavior: event.target.value as MovementRule['captureBehavior'] })} style={{ padding: '6px', border: '1px solid #d0d7de', borderRadius: 6 }}>
                                <option value="move-only">Move Only</option>
                                <option value="capture-only">Capture Only</option>
                                <option value="move-and-capture">Move and Capture</option>
                              </select>
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: '#475569', fontWeight: 700 }}>
                              Capture Method
                              <select
                                value={rule.captureMethod ?? 'normal'}
                                onChange={event => updateMovementRule(pieceIndex, ruleIndex, {
                                  captureMethod: event.target.value as MovementRule['captureMethod'],
                                  landingSquareRequired: event.target.value === 'jump' ? true : false
                                })}
                                style={{ padding: '6px', border: '1px solid #d0d7de', borderRadius: 6 }}
                              >
                                <option value="normal">Normal</option>
                                <option value="jump">Jump Capture</option>
                              </select>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: '#475569', fontWeight: 700 }}>
                              <input
                                type="checkbox"
                                checked={rule.captureRequired ?? false}
                                onChange={event => updateMovementRule(pieceIndex, ruleIndex, { captureRequired: event.target.checked })}
                              />
                              Capture required for this rule
                            </label>
                            {(rule.captureMethod ?? 'normal') === 'jump' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                <div style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 700 }}>Jump Capture Details</div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                  {checkersJumpOffsets.map(jump => (
                                    <button
                                      key={jump.label}
                                      type="button"
                                      onClick={() => updateMovementRule(pieceIndex, ruleIndex, {
                                        type: 'jump',
                                        offsets: jump.offsets,
                                        capturedPieceOffset: jump.capturedPieceOffset,
                                        captureMethod: 'jump',
                                        landingSquareRequired: true,
                                        captureBehavior: rule.captureBehavior === 'move-only' ? 'capture-only' : rule.captureBehavior
                                      })}
                                      style={{ padding: '5px 7px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700 }}
                                    >
                                      {jump.label}
                                    </button>
                                  ))}
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: '#475569', fontWeight: 700 }}>
                                  <input
                                    type="checkbox"
                                    checked={rule.landingSquareRequired ?? false}
                                    onChange={event => updateMovementRule(pieceIndex, ruleIndex, { landingSquareRequired: event.target.checked })}
                                  />
                                  Landing square required
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: '#475569', fontWeight: 700 }}>
                                  Captured Piece Position
                                  <input
                                    value={rule.capturedPieceOffset ?? ''}
                                    onChange={event => updateMovementRule(pieceIndex, ruleIndex, { capturedPieceOffset: event.target.value })}
                                    placeholder="1,1"
                                    style={{ padding: '6px', border: '1px solid #d0d7de', borderRadius: 6 }}
                                  />
                                </label>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.82rem', color: '#2c3e50', fontWeight: 700 }}>Promotions</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Describe when a base piece promotes into another piece. This is draft metadata only.</div>
                </div>
                <button
                  type="button"
                  onClick={addPromotionRule}
                  disabled={getSelectedPieces().length === 0}
                  style={{ padding: '6px 9px', borderRadius: 6, border: '1px solid #d0d7de', background: getSelectedPieces().length === 0 ? '#f8fafc' : '#fff', cursor: getSelectedPieces().length === 0 ? 'not-allowed' : 'pointer', fontWeight: 700 }}
                >
                  Add Promotion
                </button>
              </div>

              {(selectedRuleset.promotionRules ?? []).length === 0 ? (
                <div style={{ fontSize: '0.74rem', color: '#64748b', padding: '8px', border: '1px dashed #cbd5e1', borderRadius: 6 }}>
                  No promotion rules yet. Add pieces first, then create rules like checker promotes to king on the far row.
                </div>
              ) : (
                (selectedRuleset.promotionRules ?? []).map((rule, ruleIndex) => (
                  <div key={`${rule.id}-${ruleIndex}`} style={{ display: 'flex', flexDirection: 'column', gap: '7px', padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{getPromotionRuleSummary(rule, getSelectedPieces())}</div>
                      <button type="button" onClick={() => removePromotionRule(ruleIndex)} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff', color: '#991b1b', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>
                        Remove
                      </button>
                    </div>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: '#475569', fontWeight: 700 }}>
                      When this piece reaches...
                      <select value={rule.sourcePieceId} onChange={event => updatePromotionRule(ruleIndex, { sourcePieceId: event.target.value })} style={{ padding: '6px', border: '1px solid #d0d7de', borderRadius: 6 }}>
                        <option value="">Choose source piece</option>
                        {getSelectedPieces().map(piece => (
                          <option key={piece.id} value={piece.id}>{piece.displayName || piece.name || piece.id}</option>
                        ))}
                      </select>
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: '#475569', fontWeight: 700 }}>
                      Promote into...
                      <select value={rule.targetPieceId} onChange={event => updatePromotionRule(ruleIndex, { targetPieceId: event.target.value })} style={{ padding: '6px', border: '1px solid #d0d7de', borderRadius: 6 }}>
                        <option value="">Choose promoted piece</option>
                        {getSelectedPieces().map(piece => (
                          <option key={piece.id} value={piece.id}>{piece.displayName || piece.name || piece.id}</option>
                        ))}
                      </select>
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: '#475569', fontWeight: 700 }}>
                      Promotion Condition
                      <select value={rule.condition} onChange={event => updatePromotionRule(ruleIndex, { condition: event.target.value as PromotionRule['condition'] })} style={{ padding: '6px', border: '1px solid #d0d7de', borderRadius: 6 }}>
                        <option value="team-relative-last-row">Team-relative last row</option>
                      </select>
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: '#475569', fontWeight: 700 }}>
                      Zone Label
                      <input value={rule.zoneDescription ?? ''} onChange={event => updatePromotionRule(ruleIndex, { zoneDescription: event.target.value })} placeholder="opponent back row" style={{ padding: '6px', border: '1px solid #d0d7de', borderRadius: 6 }} />
                    </label>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.82rem', color: '#2c3e50', fontWeight: 700 }}>Win Conditions</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Describe how this custom game can be won. This is metadata only.</div>
                </div>
                <button type="button" onClick={addWinCondition} style={{ padding: '6px 9px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                  Add Win Condition
                </button>
              </div>

              {(selectedRuleset.winConditions ?? []).length === 0 ? (
                <div style={{ fontSize: '0.74rem', color: '#64748b', padding: '8px', border: '1px dashed #cbd5e1', borderRadius: 6 }}>
                  No win conditions yet. Checkers usually wins by eliminating opponent pieces or leaving them with no legal moves.
                </div>
              ) : (
                (selectedRuleset.winConditions ?? []).map((condition, conditionIndex) => (
                  <div key={`${condition.id}-${conditionIndex}`} style={{ display: 'flex', flexDirection: 'column', gap: '7px', padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{getWinConditionSummary(condition, getSelectedPieces())}</div>
                      <button type="button" onClick={() => removeWinCondition(conditionIndex)} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff', color: '#991b1b', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>
                        Remove
                      </button>
                    </div>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: '#475569', fontWeight: 700 }}>
                      Win Condition
                      <select value={condition.type} onChange={event => updateWinCondition(conditionIndex, { type: event.target.value as WinCondition['type'] })} style={{ padding: '6px', border: '1px solid #d0d7de', borderRadius: 6 }}>
                        <option value="eliminate-opponent-pieces">Eliminate all opponent pieces</option>
                        <option value="opponent-no-legal-moves">Opponent has no legal moves</option>
                        <option value="capture-target-piece">Capture target piece</option>
                        <option value="custom">Custom / placeholder</option>
                      </select>
                    </label>
                    {condition.type === 'capture-target-piece' && (
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: '#475569', fontWeight: 700 }}>
                        Target Piece
                        <select value={condition.targetPieceId ?? ''} onChange={event => updateWinCondition(conditionIndex, { targetPieceId: event.target.value })} style={{ padding: '6px', border: '1px solid #d0d7de', borderRadius: 6 }}>
                          <option value="">Choose target piece</option>
                          {getSelectedPieces().map(piece => (
                            <option key={piece.id} value={piece.id}>{piece.displayName || piece.name || piece.id}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: '#475569', fontWeight: 700 }}>
                      Notes
                      <input value={condition.description ?? ''} onChange={event => updateWinCondition(conditionIndex, { description: event.target.value })} placeholder="Optional friendly explanation" style={{ padding: '6px', border: '1px solid #d0d7de', borderRadius: 6 }} />
                    </label>
                  </div>
                ))
              )}
            </div>
              </>
            )}

            {ruleBuilderLayer === 'system' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '9px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }}>
                  <div>
                    <div style={{ fontSize: '0.82rem', color: '#2c3e50', fontWeight: 700 }}>System Checks</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Validation, testing, export readiness, and package diagnostics live here.</div>
                  </div>
                  {(() => {
                    const readiness = getRulesetReadiness(selectedRuleset);
                    return (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Approval status: {statusLabels[selectedRuleset.status]}</span>
                        <span style={{ padding: '3px 6px', borderRadius: 999, border: `1px solid ${readiness.border}`, background: readiness.background, color: readiness.color, fontSize: '0.66rem', fontWeight: 800 }}>
                          {readiness.label}
                        </span>
                      </div>
                    );
                  })()}
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Engine status: First custom runtime supports sandbox-playable local games.</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Compatibility: Supported custom games can start from Let&apos;s Play; Standard Chess gameplay is unchanged.</div>
                  {selectedRuleset.status === 'approved' && (
                    <div style={{ fontSize: '0.7rem', color: '#166534' }}>
                      Approved sandbox-playable rulesets are available in Let&apos;s Play Custom Game.
                    </div>
                  )}
                </div>

            {validation && (
              <div style={{ padding: '9px', borderRadius: 6, border: `1px solid ${validation.valid ? '#86efac' : '#fecaca'}`, background: validation.valid ? '#f0fdf4' : '#fef2f2', color: validation.valid ? '#166534' : '#991b1b', fontSize: '0.74rem' }}>
                {validation.messages.map(message => <div key={message}>{message}</div>)}
              </div>
            )}

            {approvalMessage && (
              <div style={{ padding: '9px', borderRadius: 6, border: `1px solid ${selectedRuleset.status === 'approved' ? '#86efac' : '#d0d7de'}`, background: selectedRuleset.status === 'approved' ? '#f0fdf4' : '#f8fafc', color: selectedRuleset.status === 'approved' ? '#166534' : '#334155', fontSize: '0.74rem' }}>
                {approvalMessage}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" onClick={runValidation} disabled={!validation?.valid} style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #2c3e50', background: validation?.valid ? '#2c3e50' : '#94a3b8', color: '#fff', cursor: validation?.valid ? 'pointer' : 'not-allowed', fontWeight: 700 }}>
                Validate
              </button>
              <button type="button" onClick={openSandbox} disabled={!validation?.valid} title={validation?.valid ? 'Open the safe rule test sandbox.' : 'Fix validation errors before testing.'} style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #2c3e50', background: validation?.valid ? '#fff' : '#f8fafc', color: validation?.valid ? '#2c3e50' : '#94a3b8', cursor: validation?.valid ? 'pointer' : 'not-allowed', fontWeight: 700 }}>
                Test Rules
              </button>
              <button type="button" onClick={openTestPlaySandbox} disabled={selectedRuleset.status !== 'approved'} title={selectedRuleset.status === 'approved' ? 'Preview basic movement from the starting setup.' : 'Approve this ruleset before test play.'} style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #2c3e50', background: selectedRuleset.status === 'approved' ? '#fff' : '#f8fafc', color: selectedRuleset.status === 'approved' ? '#2c3e50' : '#94a3b8', cursor: selectedRuleset.status === 'approved' ? 'pointer' : 'not-allowed', fontWeight: 700 }}>
                Test Play
              </button>
              <button type="button" onClick={approveRuleset} title={validation?.valid ? 'Approve this ruleset for future Custom Game use.' : 'Approval will explain what still needs fixing.'} style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #d0d7de', background: validation?.valid ? '#fff' : '#f8fafc', color: validation?.valid ? '#2c3e50' : '#64748b', cursor: 'pointer', fontWeight: 700 }}>
                Approve Ruleset
              </button>
              <button type="button" onClick={exportSelectedRuleset} disabled={!validation?.valid} title={validation?.valid ? 'Save this custom game as a package JSON.' : 'Fix validation errors before exporting.'} style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #d0d7de', background: validation?.valid ? '#fff' : '#f8fafc', color: validation?.valid ? '#2c3e50' : '#94a3b8', cursor: validation?.valid ? 'pointer' : 'not-allowed', fontWeight: 700 }}>
                Save Custom Game
              </button>
            </div>

                <details style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '9px', background: '#f8fafc' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#334155', fontSize: '0.74rem' }}>Raw RulePackage Preview</summary>
                  <pre style={{ maxHeight: 220, overflow: 'auto', margin: '8px 0 0', whiteSpace: 'pre-wrap', fontSize: '0.68rem', color: '#475569' }}>
                    {JSON.stringify(selectedRuleset, null, 2)}
                  </pre>
                </details>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default RuleBuilderView;
