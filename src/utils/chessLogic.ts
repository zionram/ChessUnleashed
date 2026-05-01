import { Chess } from 'chess.js';

export const createGame = (fen?: string) => {
  try {
    return new Chess(fen);
  } catch (e) {
    console.error('Failed to create Chess instance', e);
    return new Chess();
  }
};

export const getPieceAt = (game: Chess, square: string) => {
  return game.get(square as any);
};

export const makeMove = (game: Chess, move: string | { from: string; to: string; promotion?: string }) => {
  try {
    return game.move(move);
  } catch (e) {
    return null;
  }
};

export const getLegalMoves = (game: Chess, square?: string) => {
  return game.moves({ square: square as any, verbose: true });
};
