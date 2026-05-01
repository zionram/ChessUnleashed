import type { BotSettings } from '../context/SettingsContext';
import type { EngineCapabilities, EngineLine } from './EngineAdapter';

export interface GameState {
  fen: string;
  turn: 'w' | 'b';
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  history: string[];
  legalMoves: any[];
}

export abstract class BaseEngine {
  abstract id: string;
  abstract name: string;
  abstract description: string;
  abstract capabilities: EngineCapabilities;

  abstract initialize(fen?: string): void;
  abstract getGameState(): GameState;
  abstract getMoveHistory(options?: any): any[];
  abstract getLegalMoves(square?: string): any[];
  abstract makeMove(move: any): boolean;
  abstract undoMove(): boolean;
  abstract getPiece(square: string): { type: string; color: string } | null;
  abstract reset(): void;
  abstract getBoard(): any[][];
  abstract getBoardAtFen(fen: string): any[][];
  abstract evaluate(): number;
  abstract getTopLines(count?: number, depth?: number, botSettings?: BotSettings): EngineLine[];
}
