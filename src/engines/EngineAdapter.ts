export interface EngineMove {
  from: string;
  to: string;
  promotion?: string;
}

export interface EngineLine {
  move: EngineMove;
  san?: string;
  score?: number;
  line?: EngineMove[];
  reason?: string;
}

export interface EngineCapabilities {
  supportsDifficulty: boolean;
  supportsDepth: boolean;
  supportsMultiPV: boolean;
  supportsPersonality: boolean;
  supportsMoveExplanation: boolean;
}

export interface EngineAdapter {
  capabilities: EngineCapabilities;
  getTopLines(count?: number, depth?: number): EngineLine[];
}

export const toEngineMove = (move: { from: string; to: string; promotion?: string }): EngineMove => ({
  from: move.from,
  to: move.to,
  ...(move.promotion ? { promotion: move.promotion } : {})
});

export const normalizeEngineLine = (line: EngineLine): EngineLine => ({
  move: toEngineMove(line.move),
  ...(line.san ? { san: line.san } : {}),
  ...(line.score !== undefined ? { score: line.score } : {}),
  ...(line.line ? { line: line.line.map(toEngineMove) } : {}),
  ...(line.reason ? { reason: line.reason } : {})
});
