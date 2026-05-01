import { Chess, type Square } from 'chess.js';
import { BaseEngine, type GameState } from './BaseEngine';
import type { BotSettings } from '../context/SettingsContext';

const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0
};

const DIFFICULTY_DEPTH: Record<BotSettings['difficulty'], number> = {
  Easy: 1,
  Casual: 1,
  Intermediate: 1,
  Advanced: 2,
  Expert: 3,
  Master: 4,
  Grandmaster: 5
};

export class StandardChessEngine implements BaseEngine {
  game: Chess;
  id = 'standard';
  name = 'Standard Chess';
  description = 'Standard Chess Engine';
  capabilities = {
    supportsDifficulty: true,
    supportsDepth: true,
    supportsMultiPV: true,
    supportsPersonality: true,
    supportsMoveExplanation: true
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
      const result = this.game.move(move);
      if (result) {
        console.log("MOVE:", result);
        if (result.captured) {
          console.log("CAPTURE:", result.captured);
        }
      }
      return !!result;
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

  getTopLines(count: number = 3, depth: number = 4, botSettings?: BotSettings): any[] {
    const moves = this.game.moves({ verbose: true });
    const effectiveDepth = botSettings ? DIFFICULTY_DEPTH[botSettings.difficulty] : depth;
    const difficultyWeight = Math.max(1, effectiveDepth);
    const history = this.game.history();

    return moves
      .map(move => {
        let score = 0;
        const reasons: string[] = [];

        if (move.captured) {
          const captureScore = (PIECE_VALUES[move.captured] || 0) * (botSettings?.capturePriority ?? 1) * difficultyWeight;
          score += captureScore;
          reasons.push(`capture +${captureScore.toFixed(2)}`);
        }

        if (move.san.includes('+') || move.san.includes('#')) {
          const checkScore = 2 * (botSettings?.checkPriority ?? 1) * difficultyWeight;
          score += checkScore;
          reasons.push(`check +${checkScore.toFixed(2)}`);
        }

        if (botSettings?.avoidRepetition && history.includes(move.san)) {
          score -= 2;
          reasons.push('repetition -2.00');
        }

        const randomnessScore = (Math.random() - 0.5) * (botSettings?.randomness ?? 0);
        score += randomnessScore;
        if (randomnessScore !== 0) reasons.push(`random ${randomnessScore.toFixed(2)}`);

        return {
          move: {
            from: move.from,
            to: move.to,
            promotion: move.promotion
          },
          san: move.san,
          line: [move],
          score,
          reason: reasons.length ? reasons.join(', ') : 'legal move'
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, count);
  }

  getLegalMoves(square?: string): any[] {
    return this.game.moves({ square: square as Square, verbose: true });
  }

  getPiece(square: string) {
    const piece = this.game.get(square as Square);
    return piece ? { type: piece.type, color: piece.color } : null;
  }
}
