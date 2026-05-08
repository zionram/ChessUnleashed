export const PIECE_ICONS = {
  any: '♟♞♜',
  pawn: '♟',
  knight: '♞',
  bishop: '♝',
  rook: '♜',
  queen: '♛',
  king: '♚',
} as const;

export type PieceIconKey = keyof typeof PIECE_ICONS;

export const getPieceIcon = (piece: string | undefined): string => {
  if (!piece) return PIECE_ICONS.any;
  return PIECE_ICONS[piece as PieceIconKey] ?? PIECE_ICONS.any;
};
