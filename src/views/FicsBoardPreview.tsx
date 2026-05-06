import React, { useState, useEffect } from 'react';
import type { Style12Data } from '../services/online/fics/FicsTypes';
import { getFicsAdapter } from '../services/online/fics/FicsAdapter';

const PIECE_GLYPH: Record<string, string> = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟'
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const fmt = (secs: number): string => {
  const s = Math.max(0, Math.abs(secs));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// board[0]=rank8, board[7]=rank1; light when (rankIdx + fileIdx) % 2 === 1
const isLight = (ri: number, fi: number) => (ri + fi) % 2 === 1;

const SQ = 26;

const RELATION_LABELS: Record<string, string> = {
  1: 'playing (white)',
  '-1': 'playing (black)',
  2: 'observing',
  0: 'examining',
};

interface Props {
  style12: Style12Data | null;
  onMove?: (uciMove: string) => void;
}

const FicsBoardPreview: React.FC<Partial<Props>> = ({ style12: externalStyle12, onMove }) => {
  const adapter = getFicsAdapter();
  const [internalStyle12, setInternalStyle12] = useState<Style12Data | null>(adapter.latestStyle12);
  const style12 = externalStyle12 ?? internalStyle12;
  const moveSender = onMove ?? ((uciMove: string) => adapter.sendMove(uciMove));
  const [flipped, setFlipped] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (externalStyle12) return;
    const unsubscribe = adapter.onStyle12(s12 => setInternalStyle12(s12));
    return unsubscribe;
  }, [adapter, externalStyle12]);

  useEffect(() => {
    if (style12) {
      setFlipped(style12.myRelation === -1);
      setSelected(null);
    }
  }, [style12?.gameId]);

  if (!style12) {
    return (
      <div className="cu-panel-card cu-empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 10px', gap: 4, fontSize: '0.72rem' }}>
        <div>— No FICS board data —</div>
        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Open or observe a FICS game to populate Your Game.</div>
      </div>
    );
  }

  const { board, turn, whiteName, blackName, whiteClock, blackClock, gameId, moveNumber, lastMoveSan, myRelation } = style12;
  const isPlaying = Math.abs(myRelation) === 1;
  const myTurn = (myRelation === 1 && turn === 'white') || (myRelation === -1 && turn === 'black');

  const rankIndices = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const fileIndices = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  const squareToCoord = (ri: number, fi: number): string => {
    const file = FILES[fi];
    const rank = 8 - ri;
    return `${file}${rank}`;
  };

  const handleSquareClick = (ri: number, fi: number) => {
    if (!isPlaying || !myTurn || !moveSender) return;
    const coord = squareToCoord(ri, fi);
    const piece = board[ri][fi];
    const isMyPiece = myRelation === 1
      ? (piece >= 'A' && piece <= 'Z')
      : (piece >= 'a' && piece <= 'z');

    if (!selected) {
      if (isMyPiece) setSelected(coord);
      return;
    }
    if (coord === selected) {
      setSelected(null);
      return;
    }
    moveSender(selected + coord);
    setSelected(null);
  };

  const playerBar = (name: string, clock: number, active: boolean) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 6px', background: 'rgba(15,23,42,0.85)', fontSize: '0.72rem' }}>
      <span style={{ color: active ? '#f1f5f9' : '#64748b', fontWeight: active ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '72%' }}>
        {active && <span style={{ color: '#86efac', marginRight: 4 }}>●</span>}{name}
      </span>
      <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: active ? '#86efac' : '#64748b', flexShrink: 0 }}>{fmt(clock)}</span>
    </div>
  );

  const topPlayer = flipped ? whiteName : blackName;
  const topClock = flipped ? whiteClock : blackClock;
  const topActive = flipped ? turn === 'white' : turn === 'black';
  const bottomPlayer = flipped ? blackName : whiteName;
  const bottomClock = flipped ? blackClock : whiteClock;
  const bottomActive = flipped ? turn === 'black' : turn === 'white';

  const relationLabel = RELATION_LABELS[String(myRelation)] ?? `rel:${myRelation}`;

  return (
    <div
      className="cu-fics-board-preview-stage"
      style={{
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        padding: '12px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-start'
      }}
    >
      <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 0, border: '1px solid rgba(148,163,184,0.16)', borderRadius: 6, overflow: 'hidden', background: 'rgba(8,18,34,0.72)', userSelect: 'none' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 5px', background: 'rgba(2,6,23,0.72)', fontSize: '0.6rem', color: '#475569', borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
        <span style={{ color: isPlaying ? (myTurn ? '#86efac' : '#64748b') : '#475569' }}>{relationLabel}</span>
        <button
          onClick={() => setFlipped(f => !f)}
          style={{ padding: '1px 6px', fontSize: '0.6rem', borderRadius: 4, border: '1px solid rgba(148,163,184,0.16)', background: 'rgba(15,23,42,0.72)', color: '#94a3b8', cursor: 'pointer' }}
          title="Flip board"
        >⇅</button>
      </div>

      {playerBar(topPlayer, topClock, topActive)}

      {/* Board grid */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rankIndices.map(ri => (
          <div key={ri} style={{ display: 'flex' }}>
            {fileIndices.map(fi => {
              const light = isLight(ri, fi);
              const piece = board[ri][fi];
              const glyph = PIECE_GLYPH[piece];
              const isWhitePiece = piece >= 'A' && piece <= 'Z';
              const coord = squareToCoord(ri, fi);
              const isSelected = coord === selected;
              const isClickable = isPlaying && myTurn && !!onMove;
              return (
                <div
                  key={fi}
                  onClick={() => handleSquareClick(ri, fi)}
                  style={{
                    width: SQ, height: SQ, flexShrink: 0,
                    background: isSelected
                      ? 'rgba(134,239,172,0.45)'
                      : light ? 'rgba(148,163,184,0.22)' : 'rgba(30,41,59,0.95)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: `${SQ * 0.72}px`, lineHeight: 1,
                    color: isWhitePiece ? '#f1f5f9' : '#0f172a',
                    textShadow: isWhitePiece
                      ? '0 0 2px #000, 0 0 1px #000'
                      : '0 0 2px rgba(200,220,255,0.5)',
                    cursor: isClickable ? 'pointer' : 'default',
                    outline: isSelected ? '2px solid rgba(134,239,172,0.8)' : undefined
                  }}
                >
                  {glyph ?? ''}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {playerBar(bottomPlayer, bottomClock, bottomActive)}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 5px', background: 'rgba(2,6,23,0.72)', fontSize: '0.62rem', color: '#475569', borderTop: '1px solid rgba(148,163,184,0.08)' }}>
        <span>#{gameId} · mv {moveNumber}</span>
        <span style={{ color: '#64748b' }}>{lastMoveSan !== 'none' ? lastMoveSan : '—'}</span>
      </div>
      </div>
    </div>
  );
};

export default FicsBoardPreview;
