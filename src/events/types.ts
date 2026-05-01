export type GameEvent = {
  type: string;
  payload?: unknown;
  timestamp: number;
};

export type GameEventHandler = (event: GameEvent) => void;
