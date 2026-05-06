import type { Style12Data } from './FicsTypes';

export type FicsRelation = 'playing-white' | 'playing-black' | 'observing' | 'examining' | 'unknown';
export type OnlineProviderId = 'fics';

export interface StandardMoveIntent {
  from: string;
  to: string;
  promotion?: string;
}

export type StandardOnlineCommandId =
  // session / setup
  | 'setStyle12'
  | 'quit'
  | 'setSeekVisibility'
  | 'setOpen'
  | 'setRatedDefault'
  | 'setTimeDefault'
  | 'setIncrementDefault'

  // discovery
  | 'listGames'
  | 'listSeeks'
  | 'listPlayers'
  | 'refreshCurrentGame'
  | 'getMoves'
  | 'showPendingOffers'

  // matchmaking
  | 'seekGame'
  | 'cancelSeek'
  | 'playSeek'
  | 'matchPlayer'
  | 'withdrawOffer'
  | 'acceptOffer'
  | 'declineOffer'

  // game movement / controls
  | 'move'
  | 'resign'
  | 'offerDraw'
  | 'abort'
  | 'adjourn'
  | 'resume'
  | 'rematch'
  | 'takeback'
  | 'moreTime'
  | 'flag'

  // observe / examine
  | 'observeGame'
  | 'observePlayer'
  | 'observeTopGame'
  | 'observe'
  | 'unobserve'
  | 'followPlayer'
  | 'setPrimaryObservedGame'
  | 'examineGame'
  | 'unexamine'

  // communication
  | 'say'
  | 'tell'
  | 'kibitz'
  | 'whisper'

  // board / metadata
  | 'flipBoard'
  | 'setBoardStyle'
  | 'requestFen'
  | 'requestPgn';


export interface SeekGameCommandPayload {
  timeMinutes?: number;
  incrementSeconds?: number;
  rated?: boolean;
  color?: 'auto' | 'white' | 'black';
  variant?: string;
  manual?: boolean;
  formula?: boolean;
  ratingRange?: string;
}

export interface MatchPlayerCommandPayload extends SeekGameCommandPayload {
  handle?: string;
}

export interface MessageCommandPayload {
  text?: string;
  message?: string;
  handle?: string;
}


export interface FicsNormalizedGameState {
  provider: 'fics';
  fen: string;
  gameId: string;
  relation: FicsRelation;
  canSendMoves: boolean;
  sideToMove: 'w' | 'b';
  whiteName: string;
  blackName: string;
  whiteClockSeconds: number;
  blackClockSeconds: number;
  moveNumber: number;
}

interface RegisteredCommandTranslator<TPayload = unknown> {
  provider: OnlineProviderId;
  standardId: StandardOnlineCommandId | string;
  toProviderCommand: (payload: TPayload) => string | null;
}

class OnlineCommandTranslationRegistry {
  private readonly translators = new Map<string, RegisteredCommandTranslator>();

  register<TPayload>(translator: RegisteredCommandTranslator<TPayload>): void {
    const key = this.getKey(translator.provider, translator.standardId);
    this.translators.set(key, translator as RegisteredCommandTranslator);
  }

  translate(provider: OnlineProviderId, standardId: StandardOnlineCommandId | string, payload?: unknown): string | null {
    const translator = this.translators.get(this.getKey(provider, standardId));
    return translator ? translator.toProviderCommand(payload) : null;
  }

  has(provider: OnlineProviderId, standardId: StandardOnlineCommandId | string): boolean {
    return this.translators.has(this.getKey(provider, standardId));
  }

  private getKey(provider: OnlineProviderId, standardId: StandardOnlineCommandId | string): string {
    return `${provider}:${standardId}`;
  }
}

export const onlineCommandTranslationRegistry = new OnlineCommandTranslationRegistry();

const normalizeRank = (rank: string): string => {
  let empty = 0;
  let out = '';
  for (const ch of rank) {
    if (ch === '-' || ch === ' ') {
      empty += 1;
      continue;
    }
    if (empty > 0) {
      out += String(empty);
      empty = 0;
    }
    out += ch;
  }
  if (empty > 0) out += String(empty);
  return out || '8';
};

const rotateBoard180 = (board: string[]): string[] =>
  [...board].reverse().map(rank => rank.split('').reverse().join(''));


const boardDifferenceScore = (a: string[], b: string[]): number => {
  let score = 0;
  for (let r = 0; r < 8; r += 1) {
    const ar = a[r] ?? '';
    const br = b[r] ?? '';
    for (let f = 0; f < 8; f += 1) {
      if ((ar[f] ?? '-') !== (br[f] ?? '-')) score += 1;
    }
  }
  return score;
};

let lastStableGameId: number | null = null;
let lastStableBoard: string[] | null = null;

const getStableStyle12Board = (s12: Style12Data): string[] => {
  const direct = s12.board;
  const rotated = rotateBoard180(s12.board);

  if (lastStableGameId !== s12.gameId || !lastStableBoard) {
    lastStableGameId = s12.gameId;
    lastStableBoard = direct;
    return direct;
  }

  const directScore = boardDifferenceScore(lastStableBoard, direct);
  const rotatedScore = boardDifferenceScore(lastStableBoard, rotated);
  const chosen = rotatedScore + 2 < directScore ? rotated : direct;
  lastStableBoard = chosen;
  return chosen;
};


const getCastlingRights = (s12: Style12Data): string => {
  const rights = [
    s12.canCastle.wK ? 'K' : '',
    s12.canCastle.wQ ? 'Q' : '',
    s12.canCastle.bK ? 'k' : '',
    s12.canCastle.bQ ? 'q' : ''
  ].join('');
  return rights || '-';
};

const getEnPassantSquare = (s12: Style12Data): string => {
  if (s12.enPassantFile < 0 || s12.enPassantFile > 7) return '-';
  const file = 'abcdefgh'[s12.enPassantFile];
  const rank = s12.turn === 'white' ? '6' : '3';
  return `${file}${rank}`;
};

export const getFicsRelation = (myRelation: number): FicsRelation => {
  if (myRelation === 1) return 'playing-white';
  if (myRelation === -1) return 'playing-black';
  if (myRelation === 2) return 'observing';
  if (myRelation === 0) return 'examining';
  return 'unknown';
};

export const style12ToFen = (s12: Style12Data): string => {
  const board = getStableStyle12Board(s12).map(normalizeRank).join('/');
  const activeColor = s12.turn === 'white' ? 'w' : 'b';
  const castling = getCastlingRights(s12);
  const enPassant = getEnPassantSquare(s12);
  const halfMove = Number.isFinite(s12.halfMoveCount) ? Math.max(0, s12.halfMoveCount) : 0;
  const fullMove = Number.isFinite(s12.moveNumber) ? Math.max(1, s12.moveNumber) : 1;
  return `${board} ${activeColor} ${castling} ${enPassant} ${halfMove} ${fullMove}`;
};

export const canSendMoveFromStyle12 = (s12: Style12Data): boolean => {
  return (s12.myRelation === 1 && s12.turn === 'white') || (s12.myRelation === -1 && s12.turn === 'black');
};

export const normalizeStyle12 = (s12: Style12Data): FicsNormalizedGameState => {
  return {
    provider: 'fics',
    fen: style12ToFen(s12),
    gameId: String(s12.gameId),
    relation: getFicsRelation(s12.myRelation),
    canSendMoves: canSendMoveFromStyle12(s12),
    sideToMove: s12.turn === 'white' ? 'w' : 'b',
    whiteName: s12.whiteName,
    blackName: s12.blackName,
    whiteClockSeconds: Math.max(0, s12.whiteClock),
    blackClockSeconds: Math.max(0, s12.blackClock),
    moveNumber: s12.moveNumber
  };
};

const normalizeMoveIntent = (payload: unknown): StandardMoveIntent | null => {
  if (typeof payload === 'string') {
    const raw = payload.trim().toLowerCase();
    const match = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/.exec(raw);
    return match ? { from: match[1], to: match[2], promotion: match[3] } : null;
  }

  const move = payload as Partial<StandardMoveIntent> | null | undefined;
  const from = typeof move?.from === 'string' ? move.from.trim().toLowerCase() : '';
  const to = typeof move?.to === 'string' ? move.to.trim().toLowerCase() : '';
  if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to)) return null;

  const promotion = typeof move?.promotion === 'string' ? move.promotion.trim().toLowerCase()[0] : undefined;
  const isPromotionRank = /[18]$/.test(to);
  return {
    from,
    to,
    ...(isPromotionRank && promotion && /^[qrbn]$/.test(promotion) ? { promotion } : {})
  };
};

export const registerFicsCommandTranslator = <TPayload,>(
  standardId: StandardOnlineCommandId | string,
  toProviderCommand: (payload: TPayload) => string | null
): void => {
  onlineCommandTranslationRegistry.register<TPayload>({
    provider: 'fics',
    standardId,
    toProviderCommand
  });
};

const asTrimmedString = (value: unknown): string => String(value ?? '').trim();

const asPositiveNumber = (value: unknown, fallback?: number): number | undefined => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const asNonNegativeNumber = (value: unknown, fallback?: number): number | undefined => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
};

const asRatedToken = (rated: unknown): string => rated ? 'rated' : 'unrated';

const normalizeColorToken = (color: unknown): string => {
  const raw = asTrimmedString(color).toLowerCase();
  if (raw === 'white' || raw === 'w') return 'white';
  if (raw === 'black' || raw === 'b') return 'black';
  return '';
};

const joinCommand = (...parts: Array<string | number | null | undefined | false>): string =>
  parts
    .filter(part => part !== false && part !== null && part !== undefined && String(part).trim() !== '')
    .map(part => String(part).trim())
    .join(' ');

const registerDefaultFicsCommands = (): void => {
  // Session / setup
  registerFicsCommandTranslator('setStyle12', () => 'set style 12');
  registerFicsCommandTranslator('quit', () => 'quit');
  registerFicsCommandTranslator<{ enabled?: boolean }>('setSeekVisibility', payload => `set seek ${payload?.enabled === false ? 0 : 1}`);
  registerFicsCommandTranslator<{ enabled?: boolean }>('setOpen', payload => `set open ${payload?.enabled === false ? 0 : 1}`);
  registerFicsCommandTranslator<{ rated?: boolean }>('setRatedDefault', payload => `set rated ${payload?.rated ? 1 : 0}`);
  registerFicsCommandTranslator<{ minutes?: number }>('setTimeDefault', payload => {
    const minutes = asPositiveNumber(payload?.minutes);
    return minutes === undefined ? null : `set time ${minutes}`;
  });
  registerFicsCommandTranslator<{ seconds?: number }>('setIncrementDefault', payload => {
    const seconds = asNonNegativeNumber(payload?.seconds);
    return seconds === undefined ? null : `set inc ${seconds}`;
  });

  // Discovery
  registerFicsCommandTranslator('listGames', () => 'games');
  registerFicsCommandTranslator('listSeeks', () => 'sought');
  registerFicsCommandTranslator('listPlayers', () => 'who');
  registerFicsCommandTranslator('refreshCurrentGame', () => 'refresh');
  registerFicsCommandTranslator<{ gameId?: string | number; handle?: string }>('getMoves', payload => {
    const target = asTrimmedString(payload?.gameId ?? payload?.handle);
    return target ? `moves ${target}` : 'moves';
  });
  registerFicsCommandTranslator('showPendingOffers', () => 'pending');

  // Matchmaking
  registerFicsCommandTranslator<SeekGameCommandPayload>('seekGame', payload => {
    const time = asPositiveNumber(payload?.timeMinutes);
    const inc = asNonNegativeNumber(payload?.incrementSeconds, 0);
    if (time === undefined || inc === undefined) return null;
    const color = normalizeColorToken(payload?.color);
    const variant = asTrimmedString(payload?.variant);
    const manual = payload?.manual === true ? 'manual' : '';
    const formula = payload?.formula === true ? 'formula' : '';
    const ratingRange = asTrimmedString(payload?.ratingRange);
    return joinCommand('seek', time, inc, asRatedToken(payload?.rated), color, variant, manual, formula, ratingRange);
  });
  registerFicsCommandTranslator<{ seekId?: string | number }>('cancelSeek', payload => {
    const seekId = asTrimmedString(payload?.seekId);
    return seekId ? `unseek ${seekId}` : 'unseek';
  });
  registerFicsCommandTranslator<{ seekId?: string | number; handle?: string } | string | number>('playSeek', payload => {
    const target = typeof payload === 'string' || typeof payload === 'number'
      ? asTrimmedString(payload)
      : asTrimmedString(payload?.seekId ?? payload?.handle);
    return target ? `play ${target}` : null;
  });
  registerFicsCommandTranslator<MatchPlayerCommandPayload>('matchPlayer', payload => {
    const handle = asTrimmedString(payload?.handle);
    const time = asPositiveNumber(payload?.timeMinutes);
    const inc = asNonNegativeNumber(payload?.incrementSeconds, 0);
    if (!handle || time === undefined || inc === undefined) return null;
    const color = normalizeColorToken(payload?.color);
    const variant = asTrimmedString(payload?.variant);
    return joinCommand('match', handle, time, inc, asRatedToken(payload?.rated), color, variant);
  });
  registerFicsCommandTranslator<{ offerIdOrType?: string | number }>('withdrawOffer', payload => {
    const target = asTrimmedString(payload?.offerIdOrType);
    return target ? `withdraw ${target}` : 'withdraw';
  });
  registerFicsCommandTranslator<{ offerIdOrType?: string | number; fromUser?: string } | string>('acceptOffer', payload => {
    const target = typeof payload === 'string' ? asTrimmedString(payload) : asTrimmedString(payload?.offerIdOrType ?? payload?.fromUser);
    return target ? `accept ${target}` : 'accept';
  });
  registerFicsCommandTranslator<{ offerIdOrType?: string | number; fromUser?: string } | string>('declineOffer', payload => {
    const target = typeof payload === 'string' ? asTrimmedString(payload) : asTrimmedString(payload?.offerIdOrType ?? payload?.fromUser);
    return target ? `decline ${target}` : 'decline';
  });

  // Movement / game controls
  registerFicsCommandTranslator<unknown>('move', payload => {
    const move = normalizeMoveIntent(payload);
    return move ? `${move.from}${move.to}${move.promotion ?? ''}` : null;
  });
  registerFicsCommandTranslator('resign', () => 'resign');
  registerFicsCommandTranslator('offerDraw', () => 'draw');
  registerFicsCommandTranslator('abort', () => 'abort');
  registerFicsCommandTranslator('adjourn', () => 'adjourn');
  registerFicsCommandTranslator('resume', () => 'resume');
  registerFicsCommandTranslator('rematch', () => 'rematch');
  registerFicsCommandTranslator<{ moves?: number }>('takeback', payload => {
    const moves = asPositiveNumber(payload?.moves);
    return moves === undefined ? 'takeback' : `takeback ${moves}`;
  });
  registerFicsCommandTranslator<{ seconds?: number }>('moreTime', payload => {
    const seconds = asPositiveNumber(payload?.seconds);
    return seconds === undefined ? 'moretime' : `moretime ${seconds}`;
  });
  registerFicsCommandTranslator('flag', () => 'flag');

  // Observe / examine
  registerFicsCommandTranslator<{ gameId?: string | number }>('observeGame', payload => {
    const gameId = asTrimmedString(payload?.gameId);
    return gameId ? `observe ${gameId}` : null;
  });
  registerFicsCommandTranslator<{ handle?: string }>('observePlayer', payload => {
    const handle = asTrimmedString(payload?.handle);
    return handle ? `observe ${handle}` : null;
  });
  registerFicsCommandTranslator<{ category?: string }>('observeTopGame', payload => {
    const category = asTrimmedString(payload?.category);
    return category ? `observe ${category}` : null;
  });
  registerFicsCommandTranslator<{ gameId?: string | number; handle?: string }>('observe', payload => {
    const target = asTrimmedString(payload?.gameId ?? payload?.handle);
    return target ? `observe ${target}` : null;
  });
  registerFicsCommandTranslator<{ gameIdOrHandle?: string | number }>('unobserve', payload => {
    const target = asTrimmedString(payload?.gameIdOrHandle);
    return target ? `unobserve ${target}` : 'unobserve';
  });
  registerFicsCommandTranslator<{ handle?: string }>('followPlayer', payload => {
    const handle = asTrimmedString(payload?.handle);
    return handle ? `follow ${handle}` : null;
  });
  registerFicsCommandTranslator<{ gameId?: string | number }>('setPrimaryObservedGame', payload => {
    const gameId = asTrimmedString(payload?.gameId);
    return gameId ? `primary ${gameId}` : null;
  });
  registerFicsCommandTranslator<{ gameId?: string | number }>('examineGame', payload => {
    const gameId = asTrimmedString(payload?.gameId);
    return gameId ? `examine ${gameId}` : 'examine';
  });
  registerFicsCommandTranslator('unexamine', () => 'unexamine');

  // Communication
  registerFicsCommandTranslator<MessageCommandPayload>('say', payload => {
    const text = asTrimmedString(payload?.text ?? payload?.message);
    return text ? `say ${text}` : null;
  });
  registerFicsCommandTranslator<MessageCommandPayload>('tell', payload => {
    const handle = asTrimmedString(payload?.handle);
    const message = asTrimmedString(payload?.text ?? payload?.message);
    return handle && message ? `tell ${handle} ${message}` : null;
  });
  registerFicsCommandTranslator<MessageCommandPayload>('kibitz', payload => {
    const message = asTrimmedString(payload?.text ?? payload?.message);
    return message ? `kibitz ${message}` : null;
  });
  registerFicsCommandTranslator<MessageCommandPayload>('whisper', payload => {
    const message = asTrimmedString(payload?.text ?? payload?.message);
    return message ? `whisper ${message}` : null;
  });

  // Board / display. These are intentionally provider commands, not local template changes.
  registerFicsCommandTranslator<{ style?: string | number }>('setBoardStyle', payload => {
    const style = asTrimmedString(payload?.style);
    return style ? `set style ${style}` : null;
  });
  registerFicsCommandTranslator('requestFen', () => 'fen');
  registerFicsCommandTranslator('requestPgn', () => 'pgn');
};
registerDefaultFicsCommands();

export const translateFicsCommand = (standardId: StandardOnlineCommandId | string, payload?: unknown): string | null => {
  return onlineCommandTranslationRegistry.translate('fics', standardId, payload);
};
