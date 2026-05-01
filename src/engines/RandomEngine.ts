import { Chess } from 'chess.js';
import { BaseEngine, type GameState } from './BaseEngine';

export class RandomEngine implements BaseEngine {
  game: Chess;
  id = 'random';
  name = 'Random Bot';
  description = 'Plays completely random legal moves.';
  capabilities = {
    supportsDifficulty: false,
    supportsDepth: false,
    supportsMultiPV: false,
    supportsPersonality: false,
    supportsMoveExplanation: false
  };

  constructor() {
    this.game = new Chess();
  }

  initialize(fen?: string) {
    if (fen) this.game.load(fen);
    else this.game.reset();
  }

  reset() {
    this.game.reset();
  }

  makeMove(move: any): boolean {
    try {
      return !!this.game.move(move);
    } catch {
      return false;
    }
  }

  undoMove(): boolean {
    return !!this.game.undo();
  }

  getGameState(): GameState {
    return {
      fen: this.game.fen(),
      turn: this.game.turn(),
      isCheckmate: this.game.isCheckmate(),
      isDraw: this.game.isDraw(),
      isCheck: this.game.isCheck(),
      legalMoves: this.game.moves({ verbose: true }),
      history: this.game.history()
    };
  }

  getMoveHistory(options?: any): any[] {
    return this.game.history(options);
  }

  getBoard(): any[][] {
    return this.game.board();
  }

  getBoardAtFen(fen: string): any[][] {
    const tempGame = new Chess(fen);
    return tempGame.board();
  }

  evaluate(): number {
    return 0;
  }

  getTopLines(_count: number = 3, _depth: number = 4): any[] {
    const moves = this.game.moves({ verbose: true });
    if (moves.length === 0) return [];
    
    // Shuffle and return all legal moves
    return moves
      .sort(() => Math.random() - 0.5)
      .map(move => ({
        move: { from: move.from, to: move.to, promotion: move.promotion },
        san: move.san,
        score: 0,
        reason: 'Random choice'
      }));
  }

  getLegalMoves(square?: string): any[] {
    return this.game.moves({ square: square as any, verbose: true });
  }

  getPiece(square: string) {
    const piece = this.game.get(square as any);
    return piece ? { type: piece.type, color: piece.color } : null;
  }
}
