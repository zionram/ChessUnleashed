import React, { createContext, useContext, useState, useEffect, type ReactNode, useMemo, useRef } from 'react';
import { BaseEngine, type GameState } from '../engines/BaseEngine';
import { StandardChessEngine } from '../engines/StandardChessEngine';
import { RandomEngine } from '../engines/RandomEngine';
import type { EngineLine } from '../engines/EngineAdapter';
import { useSettings, type BotChatTrigger, type BotDifficulty, type EngineId } from './SettingsContext';
import { useAudio } from './AudioContext';
import { eventBus } from '../events/EventBus';
import { eventTriggerSystem } from '../events/EventTriggerSystem';
import { translateBotSettings } from '../engines/EngineTranslator';
import type { TimerColor, TimerState } from '../timer/TimerTypes';
import { applyMoveTimeUpdateState, createInitialTimerState, startTimerState, stopTimerState, tickTimerState } from '../timer/TimerEngine';
import { validateConfig } from '../validation/ConfigValidationRegistry';
import { Chess } from 'chess.js';
import { createUciWorkerBestMoveRequest } from '../engines/UciWorkerAdapter';
import {
  deriveEffectiveExperienceCompliancePolicy,
  getComplianceMode,
  type ExperienceCompliancePolicy
} from '../packages/ExperienceCompliancePolicy';
import type { Template } from '../templates';
import { clearGameSnapshot, readGameSnapshot, writeGameSnapshot, type StandardGameSnapshot } from '../runtime/GameSnapshot';
import { getFicsAdapter } from '../services/online/fics/FicsAdapter';
import { normalizeStyle12, translateFicsCommand, type FicsNormalizedGameState } from '../services/online/fics/FicsGameTranslator';
import { evaluateCustomEventDefinition, getCustomEventAudioContext, getCustomEventLogDetails } from '../events/CustomEventRuntime';

interface ChatMessage {
  text: string;
  sender: 'w' | 'b' | '?';
  time: string;
}

export type AIDifficulty = BotDifficulty;
export type RoomPolicy = 'strict' | 'hybrid' | 'override';

export interface OpponentProfile {
  name: string;
  avatar: string;
  thinkTime: number;
  style: string;
}

interface MultiplayerState {
  roomId: string | null;
  playerColor: 'w' | 'b' | null;
  isConnected: boolean;
  presence: { white: boolean; black: boolean };
  undoRequestPending: boolean;
  token: string | null;
  chat: ChatMessage[];
  vsComputer: boolean;
  computerSide: 'w' | 'b' | null;
  difficulty: AIDifficulty;
  opponentProfile: OpponentProfile;
  enforceSharedExp: boolean;
  allowPersonalPieces: boolean;
  compliancePolicy: ExperienceCompliancePolicy;
  complianceResolution: ComplianceResolutionState | null;
  hostExperience: any | null;
}

interface ComplianceResolutionState {
  id: string;
  message: string;
  missingItems: string[];
  canApplyFromHostPayload: boolean;
  canDecline: boolean;
  hostExperience: any;
  policy: ExperienceCompliancePolicy;
}

interface AnalysisData {
  evaluation: number;
  topLines: EngineLine[];
}

interface TimeoutResult {
  loser: TimerColor;
  winner: TimerColor;
}

interface ResignationResult {
  loser: TimerColor;
  winner: TimerColor;
}

interface GameContextType {
  engine: BaseEngine;
  gameState: GameState;
  historyIndex: number;
  viewFen: string;
  makeMove: (move: any) => boolean;
  undoMove: () => boolean;
  resetGame: () => void;
  navigateToHistory: (index: number) => void;
  isViewingCurrent: boolean;
  multiplayer: MultiplayerState;
  createRoom: (serverIp?: string) => void;
  joinRoom: (serverIp: string, roomId: string) => void;
  leaveRoom: () => void;
  syncTheme: (template: any) => void;
  requestUndo: () => void;
  handleUndoResponse: (accept: boolean) => void;
  sendChatMessage: (text: string) => void;
  startVsComputer: (side: 'w' | 'b') => void;
  setAIDifficulty: (d: AIDifficulty) => void;
  setOpponentProfile: (profile: Partial<OpponentProfile>) => void;
  updateRoomSettings: (settings: { enforceSharedExp: boolean, allowPersonalPieces: boolean, compliancePolicy?: ExperienceCompliancePolicy }) => void;
  acceptComplianceResolution: () => void;
  declineComplianceResolution: () => void;
  requestHostAssets: () => void;
  analysis: AnalysisData;
  previewLine: any[] | null;
  setPreviewLine: (line: any[] | null) => void;
  analysisPerspective: 'w' | 'b' | 'you';
  setAnalysisPerspective: (p: 'w' | 'b' | 'you') => void;
  timerState: TimerState;
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: (activeColor?: TimerColor) => void;
  applyMoveTimeUpdate: (movingColor: TimerColor, nextActiveColor: TimerColor) => void;
  pendingClockPress: { movingColor: TimerColor; nextActiveColor: TimerColor } | null;
  awaitingClockPress: boolean;
  pressClock: () => void;
  gameStartError: string | null;
  timeoutResult: TimeoutResult | null;
  resignationResult: ResignationResult | null;
  resignGame: (loser?: TimerColor) => void;
  botRuntimeStatus: BotRuntimeStatus;
  ficsGame: FicsNormalizedGameState | null;
}

interface BotRuntimeStatus {
  state: 'idle' | 'thinking' | 'move-received' | 'failed';
  message: string;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const DIFFICULTY_MAP: Record<AIDifficulty, { depth: number }> = {
  'Easy': { depth: 1 },
  'Casual': { depth: 1 },
  'Intermediate': { depth: 1 },
  'Advanced': { depth: 2 },
  'Expert': { depth: 3 },
  'Master': { depth: 4 },
  'Grandmaster': { depth: 5 }
};

const createEngine = (engineId: EngineId): BaseEngine => {
  switch (engineId) {
    case 'random':
      return new RandomEngine();
    case 'standard':
    default:
      return new StandardChessEngine();
  }
};

const getPolicyTemplateUpdates = (
  hostTemplate: Template,
  localTemplate: Template,
  policy: ExperienceCompliancePolicy
): Partial<Template> => {
  const updates: Partial<Template> = {};

  if (getComplianceMode(policy, 'board') === 'force') {
    updates.id = hostTemplate.id;
    updates.name = hostTemplate.name;
    updates.boardColors = hostTemplate.boardColors;
    updates.pathStyle = hostTemplate.pathStyle;
    updates.badgeColors = hostTemplate.badgeColors;
    updates.boardOverlay = hostTemplate.boardOverlay;
    updates.background = hostTemplate.background;
    updates.frameLayer = hostTemplate.frameLayer;
    updates.timerAppearance = hostTemplate.timerAppearance;
    updates.backgroundColor = hostTemplate.backgroundColor;
  }

  if (getComplianceMode(policy, 'pieces') === 'force') {
    updates.pieceThemeMode = hostTemplate.pieceThemeMode;
    updates.pieceTheme = hostTemplate.pieceTheme;
    updates.whitePieceTheme = hostTemplate.whitePieceTheme;
    updates.blackPieceTheme = hostTemplate.blackPieceTheme;
    updates.pieceSet = hostTemplate.pieceSet;
  } else if (getComplianceMode(policy, 'pieces') === 'allowOverride') {
    updates.pieceThemeMode = localTemplate.pieceThemeMode;
    updates.pieceTheme = localTemplate.pieceTheme;
    updates.whitePieceTheme = localTemplate.whitePieceTheme;
    updates.blackPieceTheme = localTemplate.blackPieceTheme;
    updates.pieceSet = localTemplate.pieceSet;
  }

  return updates;
};

const collectPieceAssetRefs = (template: Template) => {
  const refs: string[] = [];
  const configs = [template.pieceTheme, template.whitePieceTheme, template.blackPieceTheme].filter(Boolean);
  configs.forEach(config => {
    Object.values(config?.customPieces ?? {}).forEach(value => {
      if (value) refs.push(value);
    });
    Object.values(config?.customVariants ?? {}).forEach(rules => {
      rules.forEach(rule => {
        if (rule.image) refs.push(rule.image);
      });
    });
  });
  return refs;
};

const collectBoardAssetRefs = (template: Template) => [
  template.boardOverlay.image,
  template.background.image,
  template.frameLayer.image
].filter(Boolean);

const detectComplianceMissingItems = (
  hostTemplate: Template,
  localTemplate: Template,
  policy: ExperienceCompliancePolicy
) => {
  const missingItems: string[] = [];

  if (getComplianceMode(policy, 'board') === 'force') {
    const localBoardRefs = new Set(collectBoardAssetRefs(localTemplate));
    collectBoardAssetRefs(hostTemplate).forEach(ref => {
      if (!localBoardRefs.has(ref)) missingItems.push(`Board visual asset: ${String(ref).slice(0, 80)}`);
    });
  }

  if (getComplianceMode(policy, 'pieces') === 'force') {
    const localPieceRefs = new Set(collectPieceAssetRefs(localTemplate));
    collectPieceAssetRefs(hostTemplate).forEach(ref => {
      if (!localPieceRefs.has(ref)) missingItems.push(`Piece image asset: ${String(ref).slice(0, 80)}`);
    });
  }

  return [...new Set(missingItems)];
};

const getComplianceResolutionId = (
  hostTemplate: Template,
  policy: ExperienceCompliancePolicy,
  missingItems: string[]
) => JSON.stringify({
  templateId: hostTemplate.id,
  templateName: hostTemplate.name,
  policy,
  missingItems
});

const VALUABLE_FORK_TARGETS = new Set(['k', 'q', 'r', 'king', 'queen', 'rook']);

const getTacticalMovePayload = (engine: BaseEngine, move: any, state: GameState) => {
  const destination = move?.to;
  if (!destination) return { attackedPieces: [], forkTargets: [], isSimpleFork: false };
  try {
    const legalMoves = engine.getLegalMoves(destination) ?? [];
    const attackedPieces = legalMoves
      .map(candidate => candidate?.captured)
      .filter((piece): piece is string => typeof piece === 'string' && piece.length > 0);
    const checkTarget = state.isCheck ? ['k'] : [];
    const uniqueAttackedPieces = [...new Set([...attackedPieces, ...checkTarget])];
    const forkTargets = uniqueAttackedPieces.filter(piece => VALUABLE_FORK_TARGETS.has(piece.toLowerCase()));
    return {
      attackedPieces: uniqueAttackedPieces,
      forkTargets,
      isSimpleFork: forkTargets.length >= 2
    };
  } catch {
    return { attackedPieces: [], forkTargets: [], isSimpleFork: false };
  }
};

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { settings, updateTemplate, updateBotSettings, setTrainingWheels } = useSettings();
  const { playEvent } = useAudio();
  const { timeControl } = settings;
  const engine = useMemo(() => createEngine(settings.activeEngineId), [settings.activeEngineId, settings.gameMode]);
  const [restoredStandardSnapshot] = useState<StandardGameSnapshot | null>(() => {
    const snapshot = readGameSnapshot();
    if (snapshot?.gameType !== 'standard') return null;
    try {
      if (snapshot.moveHistory.length > 0) {
        engine.reset();
        snapshot.moveHistory.forEach(move => {
          if (!engine.makeMove(move)) throw new Error(`Could not replay saved move ${move}`);
        });
        if (engine.getGameState().fen !== snapshot.fen) engine.initialize(snapshot.fen);
      } else {
        engine.initialize(snapshot.fen);
      }
      return snapshot;
    } catch (error) {
      console.warn('[GameSnapshot] Ignored invalid standard game snapshot.', error);
      clearGameSnapshot();
      engine.reset();
      return null;
    }
  });

  useEffect(() => {
    eventTriggerSystem.setAudioHandler((eventName) => {
      playEvent(eventName);
    });
  }, [playEvent]);

  useEffect(() => {
    const handler = (event: any) => {
      if (['custom.event', 'animation.play', 'animation.rule.played', 'sound.rule.played'].includes(event.type)) return;
      settings.customEvents.forEach(definition => {
        const result = evaluateCustomEventDefinition(definition, event);
        if (!result.matched) return;
        eventBus.emit({
          type: 'custom.event',
          payload: {
            eventId: definition.eventId,
            name: definition.name,
            summary: `Custom Event: ${definition.name}`,
            matchedConditions: definition.conditions,
            ...getCustomEventLogDetails(definition, event)
          }
        });
        settings.animationRules
          .filter(rule => rule.enabled && rule.eventId === definition.eventId)
          .forEach(rule => {
            const animation = settings.animationDefinitions.find(item => item.id === rule.animationId && item.enabled);
            if (!animation) return;
            const payloadTeam = (event.payload as any)?.team;
            if (rule.scope === 'white-pieces' && payloadTeam !== 'w' && payloadTeam !== 'white') return;
            if (rule.scope === 'black-pieces' && payloadTeam !== 'b' && payloadTeam !== 'black') return;
            eventBus.emit({
              type: 'animation.play',
              payload: {
                ruleId: rule.id,
                eventId: definition.eventId,
                eventName: definition.name,
                animation,
                target: rule.target,
                ...getCustomEventLogDetails(definition, event)
              }
            });
            eventBus.emit({
              type: 'animation.rule.played',
              payload: {
                summary: `Animation Rule Played: ${animation.name}`,
                animationName: animation.name,
                eventName: definition.name,
                eventId: definition.eventId,
                target: rule.target,
                ruleId: rule.id
              }
            });
          });
        playEvent(definition.eventId, getCustomEventAudioContext(event));
      });
    };
    eventBus.subscribe('*', handler);
    return () => eventBus.unsubscribe('*', handler);
  }, [settings.customEvents, settings.animationRules, settings.animationDefinitions, playEvent]);

  const [gameState, setGameState] = useState<GameState>(engine.getGameState());

  // Sync engine state mid-game when engine changes
  useEffect(() => {
    if (gameState?.fen) {
      engine.initialize(gameState.fen);
    }
  }, [engine]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [historyFens, setHistoryFens] = useState<string[]>(() =>
    restoredStandardSnapshot?.historyFens?.length ? restoredStandardSnapshot.historyFens : [engine.getGameState().fen]
  );

  // Multiplayer & AI State
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerColor, setPlayerColor] = useState<'w' | 'b' | null>(restoredStandardSnapshot?.players.playerColor ?? null);
  const [presence, setPresence] = useState({ white: false, black: false });
  const [undoRequestPending, setUndoRequestPending] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [vsComputer, setVsComputer] = useState(restoredStandardSnapshot?.vsComputer ?? false);
  const [computerSide, setComputerSide] = useState<'w' | 'b' | null>(restoredStandardSnapshot?.players.computerSide ?? null);
  const [opponentProfile, setOpponentProfileState] = useState<OpponentProfile>({
    name: 'Engine Bot', avatar: '🤖', thinkTime: 600, style: 'Balanced'
  });
  const [enforceSharedExp, setEnforceSharedExp] = useState(true);
  const [allowPersonalPieces, setAllowPersonalPieces] = useState(false);
  const [compliancePolicy, setCompliancePolicy] = useState<ExperienceCompliancePolicy>(() =>
    deriveEffectiveExperienceCompliancePolicy({ enforceSharedExp: true, allowPersonalPieces: false })
  );
  const [hostExperience, setHostExperience] = useState<any | null>(null);
  const [complianceResolution, setComplianceResolution] = useState<ComplianceResolutionState | null>(null);
  const effectiveCompliancePolicy = useMemo(
    () => deriveEffectiveExperienceCompliancePolicy({ enforceSharedExp, allowPersonalPieces, compliancePolicy }),
    [enforceSharedExp, allowPersonalPieces, compliancePolicy]
  );

  const applyHostExperienceWithPolicy = (experience: any, policy: ExperienceCompliancePolicy) => {
    const updates = getPolicyTemplateUpdates(experience as Template, settings.template, policy);
    if (Object.keys(updates).length > 0) updateTemplate(updates);
    if (getComplianceMode(policy, 'rules') === 'force' && experience.trainingWheels !== undefined) {
      setTrainingWheels(experience.trainingWheels);
    }
  };

  const acceptComplianceResolution = () => {
    if (!complianceResolution) return;
    applyHostExperienceWithPolicy(complianceResolution.hostExperience, complianceResolution.policy);
    setComplianceResolution(null);
  };

  const declineComplianceResolution = () => {
    if (!complianceResolution?.canDecline) return;
    setComplianceResolution(null);
  };

  const requestHostAssets = () => {
    if (!socket || !roomId || !complianceResolution) return;
    socket.send(JSON.stringify({
      type: 'asset_request',
      payload: {
        roomId,
        missingItems: complianceResolution.missingItems,
        categories: complianceResolution.policy
          .filter(rule => rule.mode === 'force')
          .map(rule => rule.categoryId)
      }
    }));
  };

  // Analysis & Preview State
  const [analysis, setAnalysis] = useState<AnalysisData>({ evaluation: 0, topLines: [] });
  const [previewLine, setPreviewLine] = useState<any[] | null>(null);
  const [analysisPerspective, setAnalysisPerspective] = useState<'w' | 'b' | 'you'>('you');
  const [timerState, setTimerState] = useState<TimerState>(() =>
    restoredStandardSnapshot?.timerState ?? createInitialTimerState(timeControl, engine.getGameState().turn)
  );
  const [pendingClockPress, setPendingClockPress] = useState<{ movingColor: TimerColor; nextActiveColor: TimerColor } | null>(null);
  const [gameStartError, setGameStartError] = useState<string | null>(null);
  const [timeoutResult, setTimeoutResult] = useState<TimeoutResult | null>(restoredStandardSnapshot?.result.timeoutResult ?? null);
  const [resignationResult, setResignationResult] = useState<ResignationResult | null>(restoredStandardSnapshot?.result.resignationResult ?? null);
  const [botRuntimeStatus, setBotRuntimeStatus] = useState<BotRuntimeStatus>({ state: 'idle', message: '' });
  const [ficsGame, setFicsGame] = useState<FicsNormalizedGameState | null>(null);
  const ficsGameRef = useRef<FicsNormalizedGameState | null>(null);
  const lastSnapshotWriteMs = useRef(0);
  const lastSnapshotHistoryLength = useRef(0);
  const lastGameEndEventKey = useRef('');
  const awaitingClockPress = !!pendingClockPress;
  const hasTerminalResult = !!timeoutResult || !!resignationResult || gameState.isCheckmate || gameState.isDraw;
  const botMoveStartDelayMs = settings.pieceAnimations.enabled && settings.pieceAnimations.movementSpeedMs > 0
    ? settings.pieceAnimations.movementSpeedMs + 120
    : 0;

  useEffect(() => {
    if (socket || roomId) return;
    const hasMeaningfulState = historyFens.length > 1 || vsComputer || hasTerminalResult || timerState.isRunning;
    if (!hasMeaningfulState) return;
    const now = Date.now();
    if (timerState.isRunning && historyFens.length === lastSnapshotHistoryLength.current && now - lastSnapshotWriteMs.current < 5000) return;
    lastSnapshotWriteMs.current = now;
    lastSnapshotHistoryLength.current = historyFens.length;

    writeGameSnapshot({
      version: 1,
      gameType: 'standard',
      timestamp: new Date().toISOString(),
      fen: gameState.fen,
      moveHistory: engine.getMoveHistory(),
      historyFens,
      currentTurn: gameState.turn,
      result: {
        isCheckmate: gameState.isCheckmate,
        isDraw: gameState.isDraw,
        timeoutResult,
        resignationResult
      },
      timerState: timeControl.enabled ? timerState : null,
      players: {
        playerColor,
        computerSide,
        opponentName: opponentProfile.name,
        opponentAvatar: opponentProfile.avatar
      },
      vsComputer
    });
  }, [socket, roomId, historyFens, vsComputer, hasTerminalResult, timerState, gameState.fen, gameState.turn, gameState.isCheckmate, gameState.isDraw, timeoutResult, resignationResult, timeControl.enabled, playerColor, computerSide, opponentProfile.name, opponentProfile.avatar, engine]);

  const startTimer = () => setTimerState(state => startTimerState(state, timeControl));
  const stopTimer = () => {
    setPendingClockPress(null);
    setTimerState(stopTimerState);
  };
  const resetTimer = (activeColor: TimerColor = engine.getGameState().turn) => {
    setPendingClockPress(null);
    setTimerState(createInitialTimerState(timeControl, activeColor));
  };
  const applyMoveTimeUpdate = (movingColor: TimerColor, nextActiveColor: TimerColor) => {
    setPendingClockPress(null);
    setTimerState(state => applyMoveTimeUpdateState(state, timeControl, movingColor, nextActiveColor));
  };
  const pressClock = () => {
    if (!pendingClockPress) return;
    const committedState = engine.getGameState();
    setGameState(committedState);
    applyMoveTimeUpdate(pendingClockPress.movingColor, pendingClockPress.nextActiveColor);
  };

  useEffect(() => {
    if (!timeControl.enabled) stopTimer();
  }, [timeControl.enabled]);

  useEffect(() => {
    if (timerState.isRunning || pendingClockPress || timeoutResult || resignationResult) return;
    if (timerState.whiteTimeSeconds <= 0 || timerState.blackTimeSeconds <= 0) return;
    setTimerState(createInitialTimerState(timeControl, engine.getGameState().turn));
  }, [timeControl.initialTimeSeconds, timeControl.incrementSeconds, timeControl.enabled, timerState.isRunning, timerState.whiteTimeSeconds, timerState.blackTimeSeconds, pendingClockPress, timeoutResult, resignationResult, engine]);

  useEffect(() => {
    if (!timerState.isRunning) return;
    const interval = window.setInterval(() => {
      setTimerState(state => tickTimerState(state));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerState.isRunning]);

  useEffect(() => {
    if (!timeControl.enabled || timeoutResult) return;
    const loser = timerState.whiteTimeSeconds <= 0
      ? 'w'
      : timerState.blackTimeSeconds <= 0
        ? 'b'
        : null;
    if (!loser) return;

    setPendingClockPress(null);
    setTimeoutResult({ loser, winner: loser === 'w' ? 'b' : 'w' });
    setTimerState(stopTimerState);
  }, [timeControl.enabled, timeoutResult, timerState.whiteTimeSeconds, timerState.blackTimeSeconds]);

  useEffect(() => {
    if (hasTerminalResult) stopTimer();
  }, [hasTerminalResult]);

  useEffect(() => {
    const resultKey = timeoutResult
      ? `timeout-${timeoutResult.loser}-${timeoutResult.winner}`
      : resignationResult
        ? `resignation-${resignationResult.loser}-${resignationResult.winner}`
        : gameState.isCheckmate
          ? `checkmate-${gameState.turn}`
          : gameState.isDraw
            ? `draw-${gameState.fen}`
            : '';
    if (!resultKey || lastGameEndEventKey.current === resultKey) return;
    lastGameEndEventKey.current = resultKey;
    eventBus.emit({
      type: 'game.end',
      payload: {
        reason: timeoutResult ? 'timeout' : resignationResult ? 'resignation' : gameState.isCheckmate ? 'checkmate' : 'draw',
        loser: timeoutResult?.loser ?? resignationResult?.loser ?? (gameState.isCheckmate ? gameState.turn : null),
        winner: timeoutResult?.winner ?? resignationResult?.winner ?? (gameState.isCheckmate ? (gameState.turn === 'w' ? 'b' : 'w') : null)
      }
    });
  }, [timeoutResult, resignationResult, gameState.isCheckmate, gameState.isDraw, gameState.turn, gameState.fen]);

  useEffect(() => {
  const handler = (e: any) => console.log('EVENT:', e);
  eventBus.subscribe('*', handler);
  return () => eventBus.unsubscribe('*', handler);
}, []);
  
  useEffect(() => {
    if (!!socket && !!roomId) { setAnalysis({ evaluation: 0, topLines: [] }); return; }
    setAnalysis({ evaluation: engine.evaluate(), topLines: engine.getTopLines(3, 4, settings.botSettings) });
    setPreviewLine(null);
  }, [gameState.fen, engine, socket, roomId, settings.botSettings]);

  // Enforcement logic for Shared Experience
  useEffect(() => {
    const shouldApplyHostExperience = getComplianceMode(effectiveCompliancePolicy, 'board') !== 'ignore' ||
      getComplianceMode(effectiveCompliancePolicy, 'pieces') !== 'ignore' ||
      getComplianceMode(effectiveCompliancePolicy, 'rules') !== 'ignore';

    if (socket && roomId && playerColor === 'b' && shouldApplyHostExperience && hostExperience) {
       const missingItems = detectComplianceMissingItems(hostExperience as Template, settings.template, effectiveCompliancePolicy);
       if (missingItems.length > 0) {
         const id = getComplianceResolutionId(hostExperience as Template, effectiveCompliancePolicy, missingItems);
         if (complianceResolution?.id !== id) {
           setComplianceResolution({
             id,
             message: 'The host uses files you do not have. Download/apply them to match the game experience?',
             missingItems,
             canApplyFromHostPayload: true,
             canDecline: false,
             hostExperience,
             policy: effectiveCompliancePolicy
           });
           console.debug('[ExperienceCompliancePolicy] Compliance resolution required', { missingItems, policy: effectiveCompliancePolicy });
         }
         return;
       }
       applyHostExperienceWithPolicy(hostExperience, effectiveCompliancePolicy);
       console.debug('[ExperienceCompliancePolicy] Applied host sync categories', effectiveCompliancePolicy);
    }
  }, [effectiveCompliancePolicy, hostExperience, socket, roomId, playerColor, settings.template, complianceResolution]);

  const addBotChatReaction = (trigger: BotChatTrigger, sender: 'w' | 'b' | '?' = computerSide || '?') => {
    if (!vsComputer || !settings.botSettings.botChatEnabled) return;
    const lines = settings.personalityProfiles[settings.botSettings.personality]?.chatReactions[trigger] || [];
    if (lines.length === 0) return;
    const text = lines[Math.floor(Math.random() * lines.length)];
    setChat(prev => [...prev, { text, sender, time: new Date().toLocaleTimeString() }]);
  };

  const canStartGame = () => {
    const validation = validateConfig({ settings });
    const errors = validation.issues.filter(issue => issue.severity === 'error');

    if (errors.length === 0) {
      setGameStartError(null);
      return true;
    }

    console.error('[ConfigValidation] Game start blocked by configuration errors.');
    errors.forEach(issue => {
      console.error('[ConfigValidation]', {
        message: issue.message,
        affectedSettingPaths: issue.affectedSettingPaths,
        suggestedFix: issue.suggestedFix
      });
    });

    setGameStartError('Sorry, there seems to be a conflict in your settings that prevents this game from running.');
    return false;
  };

  const leaveRoom = () => {
    if (socket) {
      socket.close();
      setSocket(null); setRoomId(null); setPlayerColor(null);
      setPresence({ white: false, black: false });
      setUndoRequestPending(false); setChat([]);
      setHostExperience(null); setEnforceSharedExp(true); setAllowPersonalPieces(false);
      setCompliancePolicy(deriveEffectiveExperienceCompliancePolicy({ enforceSharedExp: true, allowPersonalPieces: false }));
      setComplianceResolution(null);
    }
    setVsComputer(false);
    setComputerSide(null);
  };

  const startVsComputer = (side: 'w' | 'b') => {
    if (!canStartGame()) return;
    leaveRoom();
    const botSide = side === 'w' ? 'b' : 'w';
    setChat([]);
    setVsComputer(true);
    setComputerSide(botSide);
    setPlayerColor(side);
    resetGame();
    eventBus.emit({ type: 'game.start', payload: { mode: 'vsComputer', playerColor: side, computerSide: botSide } });
    playEvent('gameStart');
    if (settings.botSettings.botChatEnabled) {
      const lines = settings.personalityProfiles[settings.botSettings.personality]?.chatReactions.gameStart || [];
      if (lines.length > 0) {
        setChat([{ text: lines[Math.floor(Math.random() * lines.length)], sender: botSide, time: new Date().toLocaleTimeString() }]);
      }
    }
  };

  const setAIDifficulty = (d: AIDifficulty) => {
    updateBotSettings({ difficulty: d, depth: DIFFICULTY_MAP[d].depth });
  };
  const setOpponentProfile = (updates: Partial<OpponentProfile>) => setOpponentProfileState(prev => ({ ...prev, ...updates }));

  useEffect(() => {
    let cancelled = false;
    let workerRequest: ReturnType<typeof createUciWorkerBestMoveRequest> | null = null;
    let thinkTimer: number | null = null;

    if (ficsGame) {
      setBotRuntimeStatus(status => status.state === 'thinking' ? { state: 'idle', message: '' } : status);
      return () => {
        cancelled = true;
        workerRequest?.cancel();
      };
    }

    if (!timeoutResult && !resignationResult && !awaitingClockPress && vsComputer && gameState.turn === computerSide && !gameState.isCheckmate && !gameState.isDraw) {
      const startBotTurn = () => {
        if (cancelled) return;
        const params = translateBotSettings(settings.activeEngineId, settings.botSettings, engine.capabilities || {});
        const activeBotConfig = settings.registeredBots.find(bot => bot.id === settings.activeEngineId);
        if (activeBotConfig && activeBotConfig.type !== 'mock') {
          setBotRuntimeStatus({ state: 'thinking', message: `${activeBotConfig.name} is thinking...` });
          try {
            workerRequest = createUciWorkerBestMoveRequest(activeBotConfig.path, gameState.fen, params.depth ?? settings.botSettings.depth ?? 1);
          } catch {
            setBotRuntimeStatus({ state: 'failed', message: 'Could not load this engine. Check that the file path is correct.' });
            return;
          }
          workerRequest.promise
            .then(result => {
              if (cancelled) return;
              const move = {
                from: result.bestMove.slice(0, 2),
                to: result.bestMove.slice(2, 4),
                ...(result.bestMove.length > 4 ? { promotion: result.bestMove.slice(4, 5) } : {})
              };
              const moveSuccess = makeMove(move);
              setBotRuntimeStatus({
                state: moveSuccess ? 'move-received' : 'failed',
                message: moveSuccess
                  ? `${activeBotConfig.name} played ${result.bestMove}.`
                  : `${activeBotConfig.name} returned ${result.bestMove}, but it was not legal in this position.`
              });
              if (moveSuccess) {
                eventBus.emit({
                  type: "move.made",
                  payload: {
                    ...move,
                    move,
                    engineId: settings.activeEngineId,
                    team: computerSide,
                    isCheck: engine.getGameState().isCheck,
                    isCheckmate: engine.getGameState().isCheckmate
                  }
                });
              }
            })
            .catch(error => {
              if (cancelled) return;
              setBotRuntimeStatus({
                state: 'failed',
                message: error instanceof Error
                  ? error.message
                  : 'Worker engine failed. Switch bots or check the engine file path.'
              });
            });
          return;
        }

        setBotRuntimeStatus({ state: 'thinking', message: 'Built-in bot is thinking...' });
        thinkTimer = window.setTimeout(() => {
          if (cancelled || !engine) return;
          const topLines = engine.getTopLines(
            3,
            params.depth ?? 2,
            { ...settings.botSettings, depth: params.depth ?? settings.botSettings.depth }
          );

          if (!topLines || topLines.length === 0) {
            setBotRuntimeStatus({ state: 'failed', message: 'Built-in bot did not return any legal moves.' });
            return;
          }

          const chosen = topLines[Math.floor(Math.random() * topLines.length)];
          const moveSuccess = makeMove(chosen.move);
          setBotRuntimeStatus({
            state: moveSuccess ? 'move-received' : 'failed',
            message: moveSuccess ? 'Built-in bot move received.' : 'Built-in bot returned an illegal move.'
          });

          console.log("DEBUG: Engine accepted bot move?", moveSuccess, "Move details:", chosen.move);

          eventBus.emit({
            type: "move.made",
            payload: {
              ...chosen.move,
              move: chosen.move,
              engineId: settings.activeEngineId,
              team: computerSide,
              isCheck: engine.getGameState().isCheck,
              isCheckmate: engine.getGameState().isCheckmate
            }
          });
        }, params.thinkTime);
      };

      const timer = window.setTimeout(startBotTurn, botMoveStartDelayMs);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
        if (thinkTimer) window.clearTimeout(thinkTimer);
        workerRequest?.cancel();
      };
    }

    setBotRuntimeStatus(status => status.state === 'thinking' ? { state: 'idle', message: '' } : status);
    return () => {
      cancelled = true;
      if (thinkTimer) window.clearTimeout(thinkTimer);
      workerRequest?.cancel();
    };
  }, [timeoutResult, resignationResult, awaitingClockPress, vsComputer, gameState.turn, gameState.fen, computerSide, gameState.isCheckmate, gameState.isDraw, engine, settings.botSettings, settings.activeEngineId, settings.registeredBots, botMoveStartDelayMs, ficsGame]);

  useEffect(() => {
    const adapter = getFicsAdapter();
    const unsubscribeStyle12 = adapter.onStyle12(style12 => {
      try {
        const normalized = normalizeStyle12(style12);
        ficsGameRef.current = normalized;
        setFicsGame(normalized);
        engine.initialize(normalized.fen);
        const nextState = engine.getGameState();
        setGameState({ ...nextState });
        setHistoryFens(prev => prev[prev.length - 1] === normalized.fen ? prev : [normalized.fen]);
        setHistoryIndex(-1);
        setPreviewLine(null);
        setPendingClockPress(null);
        setTimeoutResult(null);
        setResignationResult(null);
      } catch (error) {
        console.warn('[FICS] Could not sync Style 12 state to main board:', error);
      }
    });
    const unsubscribeLogin = adapter.onLoginStatus(status => {
      if (status === 'disconnected' || status === 'login-failed' || status === 'error') {
        ficsGameRef.current = null;
        setFicsGame(null);
      }
    });
    return () => {
      unsubscribeStyle12();
      unsubscribeLogin();
    };
  }, [engine]);

  const syncGame = (fen: string, isMove: boolean = false, lastMove?: any) => {
    engine.initialize(fen);
    const newState = engine.getGameState();
    setGameState({ ...newState });
    if (isMove) {
      setHistoryFens(prev => (prev[prev.length - 1] === fen ? prev : [...prev, fen]));
      if (lastMove) triggerMoveSound(lastMove, newState);
    } else { setHistoryFens([fen]); }
    setHistoryIndex(-1); setPreviewLine(null);
  };

  const triggerMoveSound = (move: any, state: GameState) => {
    if (state.isCheckmate) {
      playEvent('check', { active: false });
      playEvent('checkmate');
    }
    else if (state.isDraw) {
      playEvent('check', { active: false });
      playEvent('draw');
    }
    else if (state.isCheck) playEvent('check', { active: true });
    else if (move.captured || move.flags?.includes('c')) playEvent('capture');
    else if (move.flags?.includes('k') || move.flags?.includes('q')) playEvent('castle');
    else if (move.flags?.includes('p')) playEvent('promotion');
    else playEvent('move');
    if (!state.isCheck) playEvent('check', { active: false });
  };

  const handleMessage = (e: MessageEvent) => {
    const { type, payload } = JSON.parse(e.data);
    if (type === 'created' || type === 'joined') {
      setRoomId(payload.roomId); setPlayerColor(payload.color);
      if (payload.token) { setToken(payload.token); sessionStorage.setItem(`chess_token_${payload.roomId}`, payload.token); }
      playEvent('gameStart');
      eventBus.emit({ type: 'game.start', payload: { mode: 'multiplayer', roomId: payload.roomId, color: payload.color } });
    }
    if (type === 'sync') syncGame(payload.fen, !!payload.lastMove, payload.lastMove);
    if (type === 'sync_full') {
      setHistoryFens(payload.history);
      syncGame(payload.history[payload.history.length - 1], false, payload.lastMove);
      if (payload.theme) setHostExperience(payload.theme);
      if (payload.chat) setChat(payload.chat);
      const nextEnforceSharedExp = payload.enforceSharedExp ?? enforceSharedExp;
      const nextAllowPersonalPieces = payload.allowPersonalPieces ?? allowPersonalPieces;
      if (payload.enforceSharedExp !== undefined) setEnforceSharedExp(payload.enforceSharedExp);
      if (payload.allowPersonalPieces !== undefined) setAllowPersonalPieces(payload.allowPersonalPieces);
      setCompliancePolicy(payload.compliancePolicy ?? deriveEffectiveExperienceCompliancePolicy({
        enforceSharedExp: nextEnforceSharedExp,
        allowPersonalPieces: nextAllowPersonalPieces
      }));
    }
    if (type === 'presence') setPresence(payload);
    if (type === 'room_settings_sync') {
       setEnforceSharedExp(payload.enforceSharedExp);
       setAllowPersonalPieces(payload.allowPersonalPieces);
       setCompliancePolicy(payload.compliancePolicy ?? deriveEffectiveExperienceCompliancePolicy({
         enforceSharedExp: payload.enforceSharedExp,
         allowPersonalPieces: payload.allowPersonalPieces
       }));
    }
    if (type === 'theme_sync') {
      setHostExperience(payload.theme ?? payload);
      if (payload.compliancePolicy) setCompliancePolicy(payload.compliancePolicy);
    }
    if (type === 'asset_request' && playerColor === 'w' && socket && roomId) {
      // Follow-up C.4.P-353: asset_response sends raw template settings including local-asset:// URLs
      // that only resolve on the host device. Full host asset transfer should use ExperiencePackage
      // zip transfer so guests receive actual media files, not host-local asset refs.
      socket.send(JSON.stringify({
        type: 'asset_response',
        payload: {
          roomId,
          theme: { ...settings.template, trainingWheels: settings.trainingWheels },
          compliancePolicy: effectiveCompliancePolicy,
          missingItems: payload.missingItems ?? []
        }
      }));
    }
    if (type === 'asset_response') {
      if (payload.theme) setHostExperience(payload.theme);
      if (payload.compliancePolicy) setCompliancePolicy(payload.compliancePolicy);
    }
    if (type === 'undo_request') setUndoRequestPending(true);
    if (type === 'undo_decline') { setUndoRequestPending(false); alert(payload.reason || "Opponent declined."); }
    if (type === 'chat') { setChat(prev => [...prev, payload]); playEvent('move'); }
  };

  const getMultiplayerServerEndpoint = (serverIpOverride?: string) => {
    const { mode, homeUrl, customUrl } = settings.multiplayerServer;
    const configuredHost = mode === 'home'
      ? homeUrl
      : mode === 'custom'
        ? customUrl
        : 'localhost';
    const rawHost = (serverIpOverride || configuredHost || 'localhost').trim();
    const normalized = rawHost
      .replace(/^wss?:\/\//i, '')
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '');
    const portMatch = normalized.match(/:(\d+)$/);
    const port = portMatch ? Number(portMatch[1]) : 8080;
    const normalizedHost = normalized.replace(/:\d+$/, '');

    return { host: normalizedHost || 'localhost', port };
  };

  const createRoom = (serverIpOverride?: string) => {
    if (!canStartGame()) return;
    clearGameSnapshot();
    setVsComputer(false);
    const { host, port } = getMultiplayerServerEndpoint(serverIpOverride);
    
    const ws = new WebSocket(`ws://${host}:${port}`);
    ws.onopen = () => {
        ws.send(JSON.stringify({ 
          type: 'create',
          payload: {
            profile: settings.localProfile
          }
        }));
        ws.send(JSON.stringify({ type: 'theme_sync', payload: { roomId: null, theme: { ...settings.template, trainingWheels: settings.trainingWheels }, compliancePolicy: effectiveCompliancePolicy } }));
    };
    ws.onmessage = handleMessage; ws.onclose = () => leaveRoom();
    setSocket(ws);
  };

  const joinRoom = (serverIpOverride: string, rId: string) => {
    clearGameSnapshot();
    setVsComputer(false);
    const { host, port } = getMultiplayerServerEndpoint(serverIpOverride);

    const normId = rId.toUpperCase();
    const storedToken = sessionStorage.getItem(`chess_token_${normId}`);
    const ws = new WebSocket(`ws://${host}:${port}`);
    ws.onopen = () => ws.send(JSON.stringify({ 
      type: 'join', 
      payload: { 
        roomId: normId, 
        token: storedToken,
        profile: settings.localProfile
      } 
    }));
    ws.onmessage = handleMessage; ws.onclose = () => leaveRoom();
    setSocket(ws);
  };

  const syncTheme = (template: any) => {
    if (socket && roomId) socket.send(JSON.stringify({ type: 'theme_sync', payload: { roomId, theme: { ...template, trainingWheels: settings.trainingWheels }, compliancePolicy: effectiveCompliancePolicy } }));
  };

  const updateRoomSettings = (s: { enforceSharedExp: boolean, allowPersonalPieces: boolean, compliancePolicy?: ExperienceCompliancePolicy }) => {
    const nextPolicy = s.compliancePolicy ?? deriveEffectiveExperienceCompliancePolicy(s);
    console.debug('[ExperienceCompliancePolicy] Room settings update', nextPolicy);
    setEnforceSharedExp(s.enforceSharedExp);
    setAllowPersonalPieces(s.allowPersonalPieces);
    setCompliancePolicy(nextPolicy);
    setComplianceResolution(null);
    if (socket && roomId) socket.send(JSON.stringify({ type: 'update_room_settings', payload: { roomId, ...s, compliancePolicy: nextPolicy } }));
  };

  const requestUndo = () => { if (socket && roomId) socket.send(JSON.stringify({ type: 'undo_request', payload: { roomId } })); };
  const handleUndoResponse = (accept: boolean) => {
    setUndoRequestPending(false);
    if (socket && roomId) socket.send(JSON.stringify({ type: accept ? 'undo_accept' : 'undo_decline', payload: { roomId } }));
  };
  const sendChatMessage = (text: string) => {
    if (socket && roomId) socket.send(JSON.stringify({ type: 'chat', payload: { roomId, text } }));
    else if (vsComputer && playerColor) setChat(prev => [...prev, { text, sender: playerColor, time: new Date().toLocaleTimeString() }]);
  };

  const makeMove = (move: any): boolean => {
    if (timeoutResult || resignationResult) return false;
    const activeFicsGame = ficsGameRef.current;
    if (activeFicsGame) {
      if (!activeFicsGame.canSendMoves) return false;
      const command = translateFicsCommand('move', move);
      if (!command) return false;
      getFicsAdapter().sendMove(command);
      return true;
    }
    if (socket && roomId) {
      if (playerColor !== engine.getGameState().turn) return false;
      socket.send(JSON.stringify({ type: 'move', payload: { roomId, move } }));
      return true;
    }
    const movingSide = engine.getGameState().turn;
    const success = engine.makeMove(move);
    console.log("DEBUG: Engine accepted bot move?", success, "Move details:", move);
    if (success) {
      const newState = engine.getGameState();
      const shouldAwaitClockPress = timeControl.enabled && timeControl.manualClockPress && (!vsComputer || movingSide !== computerSide);
      setGameState(shouldAwaitClockPress && !newState.isCheckmate && !newState.isDraw ? { ...newState, turn: movingSide } : newState);
      if (newState.isCheckmate || newState.isDraw) stopTimer();
      else if (shouldAwaitClockPress) setPendingClockPress({ movingColor: movingSide, nextActiveColor: newState.turn });
      else applyMoveTimeUpdate(movingSide, newState.turn);
      setHistoryFens(prev => [...prev, newState.fen]); setHistoryIndex(-1); setPreviewLine(null);
      const lastMoveVerbose = engine.getMoveHistory({ verbose: true }).pop();
      const tacticalPayload = getTacticalMovePayload(engine, lastMoveVerbose ?? move, newState);
      eventBus.emit({
        type: "move.made",
        payload: {
          ...move,
          move,
          pieceType: lastMoveVerbose?.piece,
          team: movingSide,
          capturedPiece: lastMoveVerbose?.captured,
          isPromotion: !!lastMoveVerbose?.promotion || lastMoveVerbose?.flags?.includes?.('p'),
          isCheck: newState.isCheck,
          isCheckmate: newState.isCheckmate,
          ...tacticalPayload
        }
      });
      if (lastMoveVerbose?.captured) {
        eventBus.emit({
          type: "piece.captured",
          payload: {
            ...lastMoveVerbose,
            pieceType: lastMoveVerbose.piece,
            team: movingSide,
            capturedPiece: lastMoveVerbose.captured
          }
        });
      }
      triggerMoveSound(lastMoveVerbose, newState);
      if (newState.isCheckmate) addBotChatReaction('checkmate');
      else if (newState.isDraw) addBotChatReaction('draw');
      else {
        if (lastMoveVerbose?.captured) {
          addBotChatReaction(movingSide === computerSide ? 'botCapture' : 'botCaptured');
        }
        if (newState.isCheck) addBotChatReaction('check');
      }

    }
    return success;
  };

  const undoMove = (): boolean => {
    if (hasTerminalResult) return false;
    if (socket && roomId) { requestUndo(); return true; }
    const success = engine.undoMove();
    if (success) {
      const newState = engine.getGameState(); setGameState(newState);
      resetTimer(newState.turn);
      setHistoryFens(prev => prev.slice(0, -1)); setHistoryIndex(-1); setPreviewLine(null); playEvent('move');
    }
    return success;
  };

  const resetGame = () => {
    if (ficsGameRef.current) return;
    if (socket && roomId) return; 
    if (!canStartGame()) return;
    clearGameSnapshot();
    engine.reset();
    const newState = engine.getGameState(); setGameState(newState);
    setPendingClockPress(null);
    setTimeoutResult(null);
    setResignationResult(null);
    setTimerState(startTimerState(createInitialTimerState(timeControl, newState.turn), timeControl));
    setHistoryFens([newState.fen]); setHistoryIndex(-1); setPreviewLine(null); playEvent('gameStart');
    eventBus.emit({ type: 'game.start', payload: { mode: 'standard' } });
  };

  const resignGame = (loser: TimerColor = playerColor || engine.getGameState().turn) => {
    if (hasTerminalResult) return;
    setPendingClockPress(null);
    setResignationResult({ loser, winner: loser === 'w' ? 'b' : 'w' });
    setTimerState(stopTimerState);
    eventBus.emit({ type: 'game.end', payload: { reason: 'resignation', loser, winner: loser === 'w' ? 'b' : 'w' } });
  };

  const navigateToHistory = (index: number) => {
    if (index < -1 || index >= historyFens.length) return;
    setHistoryIndex(index); setPreviewLine(null); playEvent('move');
  };

  const viewFen = useMemo(() => {
    const baseFen = historyIndex === -1 ? historyFens[historyFens.length - 1] : historyFens[historyIndex];
    if (previewLine && previewLine.length > 0) {
      try {
        const tempChess = new Chess(baseFen);
        for (const m of previewLine) tempChess.move(m);
        return tempChess.fen();
      } catch (e) { return baseFen; }
    }
    return baseFen;
  }, [previewLine, historyFens, historyIndex]);

  const isViewingCurrent = (historyIndex === -1 || historyIndex === historyFens.length && !previewLine);

  return (
    <GameContext.Provider value={{
      engine, gameState, historyIndex, viewFen, makeMove, undoMove, resetGame,
      navigateToHistory, isViewingCurrent,
      multiplayer: { roomId, playerColor, isConnected: !!socket, presence, undoRequestPending, token, chat, vsComputer, computerSide, difficulty: settings.botSettings.difficulty, opponentProfile, enforceSharedExp, allowPersonalPieces, compliancePolicy: effectiveCompliancePolicy, complianceResolution, hostExperience },
      createRoom, joinRoom, leaveRoom, syncTheme, requestUndo, handleUndoResponse, sendChatMessage, startVsComputer, setAIDifficulty, setOpponentProfile, updateRoomSettings, acceptComplianceResolution, declineComplianceResolution, requestHostAssets, analysis,
      previewLine, setPreviewLine, analysisPerspective, setAnalysisPerspective,
      timerState, startTimer, stopTimer, resetTimer, applyMoveTimeUpdate, pendingClockPress, awaitingClockPress, pressClock, gameStartError, timeoutResult, resignationResult, resignGame,
      botRuntimeStatus, ficsGame
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};
