import type { TimerState } from '../timer/TimerTypes';
import type { StartingPosition } from '../rules/RulePackages';

export const GAME_SNAPSHOT_STORAGE_KEY = 'chess-unleashed-game-snapshot';
export const GAME_SNAPSHOT_VERSION = 1;

export type RuntimeGameType = 'standard' | 'custom';

export type CustomGameHistoryEntryType = 'start' | 'move' | 'capture' | 'promotion' | 'turn' | 'win' | 'reset';

export interface CustomGameHistoryEntry {
  id: string;
  timestamp: string;
  type: CustomGameHistoryEntryType;
  summary: string;
}

export interface StandardGameSnapshot {
  version: typeof GAME_SNAPSHOT_VERSION;
  gameType: 'standard';
  timestamp: string;
  fen: string;
  moveHistory: string[];
  historyFens: string[];
  currentTurn: 'w' | 'b';
  result: {
    isCheckmate: boolean;
    isDraw: boolean;
    timeoutResult: { loser: 'w' | 'b'; winner: 'w' | 'b' } | null;
    resignationResult: { loser: 'w' | 'b'; winner: 'w' | 'b' } | null;
  };
  timerState: TimerState | null;
  players: {
    playerColor: 'w' | 'b' | null;
    computerSide: 'w' | 'b' | null;
    opponentName: string;
    opponentAvatar: string;
  };
  vsComputer: boolean;
}

export interface CustomRuntimeSnapshot {
  version: typeof GAME_SNAPSHOT_VERSION;
  gameType: 'custom';
  timestamp: string;
  selectedCustomRulesetId: string;
  boardState: StartingPosition[];
  currentTurnIndex: number;
  moveHistory: CustomGameHistoryEntry[];
  result: string | null;
  message: string;
  multiJumpPieceId: string | null;
  players: {
    localProfileName: string;
  };
}

export type GameSnapshot = StandardGameSnapshot | CustomRuntimeSnapshot;

export const readGameSnapshot = (): GameSnapshot | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(GAME_SNAPSHOT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GameSnapshot>;
    if (parsed.version !== GAME_SNAPSHOT_VERSION) return null;
    if (parsed.gameType !== 'standard' && parsed.gameType !== 'custom') return null;
    return parsed as GameSnapshot;
  } catch (error) {
    console.warn('[GameSnapshot] Ignored invalid saved game snapshot.', error);
    return null;
  }
};

export const writeGameSnapshot = (snapshot: GameSnapshot) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GAME_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn('[GameSnapshot] Could not save current game snapshot.', error);
  }
};

export const clearGameSnapshot = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(GAME_SNAPSHOT_STORAGE_KEY);
};
