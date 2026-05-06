import type { ConnectionStatus } from '../OnlineServiceAdapter';

export type { ConnectionStatus };

export type FicsLoginMode = 'guest' | 'account';

export type FicsLoginStatus =
  | 'disconnected'
  | 'connecting'
  | 'awaiting-login'
  | 'logging-in'
  | 'logged-in'
  | 'login-failed'
  | 'error';

export interface FicsSeekRequest {
  timeMinutes: number;
  incrementSeconds: number;
  rated: boolean;
  color: 'auto' | 'white' | 'black';
}

export interface FicsChallenge {
  id: string;
  fromUser: string;
  timeMinutes: number;
  incrementSeconds: number;
  rated: boolean;
  color: 'white' | 'black' | 'unknown';
  rawText: string;
  parsedReliably: boolean;
}

export type FicsMessageType = 'login' | 'game' | 'seek' | 'challenge' | 'chat' | 'error' | 'system' | 'unknown';

export interface Style12Data {
  board: string[];            // 8 ranks [rank8..rank1], each 8 chars
  turn: 'white' | 'black';
  enPassantFile: number;      // -1 = none, 0-7 = file index
  canCastle: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };
  halfMoveCount: number;
  gameId: number;
  whiteName: string;
  blackName: string;
  myRelation: number;         // 1=playing white, -1=playing black, 0=examining, 2=observing
  initialTimeSecs: number;
  incrementSecs: number;
  whiteClock: number;         // seconds remaining
  blackClock: number;
  moveNumber: number;
  lastMoveSan: string;
}

export interface FicsServerMessage {
  timestamp: number;
  raw: string;
  type: FicsMessageType;
  style12?: Style12Data;
}

export interface FicsGameRow {
  gameId: number;
  white: string;
  black: string;
  whiteRating: string;
  blackRating: string;
  timeMinutes: number;
  incrementSeconds: number;
  rated: boolean;
  variant: string;
  rawLine: string;
  parsedReliably: boolean;
}

export interface FicsSeekRow {
  seekId: number;
  player: string;
  rating: string;
  timeMinutes: number;
  incrementSeconds: number;
  rated: boolean;
  color: 'auto' | 'white' | 'black';
  variant: string;
  rawLine: string;
  parsedReliably: boolean;
}

export type FicsGameControlAction = 'resign' | 'draw' | 'abort' | 'adjourn';

export interface FicsGameState {
  gameId: string | null;
  active: boolean;
  whitePlayer: string;
  blackPlayer: string;
  whiteTimeMs: number;
  blackTimeMs: number;
  moveNumber: number;
  turn: 'white' | 'black';
}
