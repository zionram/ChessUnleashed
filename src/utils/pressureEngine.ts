import { Chess } from 'chess.js';

export interface PressureSource {
  square: string;
  type: string;
  color: string;
  path: string[];
}

export interface SquarePressure {
  white: PressureSource[];
  black: PressureSource[];
}

export type SquarePressureMap = Record<string, SquarePressure>;

const COLUMNS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const coordsToSquare = (r: number, c: number): string => {
  if (r < 0 || r > 7 || c < 0 || c > 7) return '';
  return `${COLUMNS[c]}${8 - r}`;
};

export const calculatePressureMap = (game: Chess): SquarePressureMap => {
  const map: SquarePressureMap = {};
  const board = game.board();

  // Initialize map
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      map[coordsToSquare(r, c)] = { white: [], black: [] };
    }
  }

  const addPressure = (targetR: number, targetC: number, sourceR: number, sourceC: number, path: string[]) => {
    const targetSquare = coordsToSquare(targetR, targetC);
    if (!targetSquare) return;
    
    const sourceSquare = coordsToSquare(sourceR, sourceC);
    const piece = board[sourceR][sourceC];
    if (!piece) return;

    const source: PressureSource = {
      square: sourceSquare,
      type: piece.type,
      color: piece.color,
      path: [...path]
    };

    if (piece.color === 'w') {
      map[targetSquare].white.push(source);
    } else {
      map[targetSquare].black.push(source);
    }
  };

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const { type, color } = piece;

      if (type === 'p') {
        const dir = color === 'w' ? -1 : 1;
        addPressure(r + dir, c - 1, r, c, []);
        addPressure(r + dir, c + 1, r, c, []);
      } else if (type === 'n') {
        const moves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
        moves.forEach(([dr, dc]) => addPressure(r + dr, c + dc, r, c, []));
      } else if (type === 'k') {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            addPressure(r + dr, c + dc, r, c, []);
          }
        }
      } else {
        // Sliding pieces
        const directions: [number, number][] = [];
        if (type === 'r' || type === 'q') directions.push([-1, 0], [1, 0], [0, -1], [0, 1]);
        if (type === 'b' || type === 'q') directions.push([-1, -1], [-1, 1], [1, -1], [1, 1]);

        directions.forEach(([dr, dc]) => {
          let tr = r + dr;
          let tc = c + dc;
          const currentPath: string[] = [];
          while (tr >= 0 && tr <= 7 && tc >= 0 && tc <= 7) {
            addPressure(tr, tc, r, c, currentPath);
            if (board[tr][tc]) break; // Blocked by ANY piece
            currentPath.push(coordsToSquare(tr, tc));
            tr += dr;
            tc += dc;
          }
        });
      }
    }
  }

  return map;
};
