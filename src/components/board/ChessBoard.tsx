import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import Square from './Square';
import Piece from './Piece';
import { calculatePressureMap, type SquarePressureMap, type PressureSource } from '../../utils/pressureEngine';
import { useGame } from '../../context/GameContext';
import { useSettings } from '../../context/SettingsContext';
import { eventBus } from '../../events/EventBus';

interface ChessBoardProps {
  onPieceSelect?: (pieceKey: string) => void;
  orientation?: 'w' | 'b';
  controlMode?: 'w' | 'b' | 'both';
}

const COLUMNS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

type BoardPiece = { type: string; color: string };
type BoardPieceMap = Record<string, BoardPiece>;
type MovingPieceAnimation = {
  id: number;
  from: string;
  to: string;
  piece: BoardPiece;
  started: boolean;
};
type TriggeredAnimation = {
  id: number;
  animation: any;
  target: string;
  square?: string;
  message?: string;
};

type MoveAnimationPayload = {
  from?: string;
  to?: string;
  team?: string;
  pieceType?: string;
  isPromotion?: boolean;
  capturedPiece?: string;
};

const piecesMatch = (a?: BoardPiece | null, b?: BoardPiece | null) =>
  !!a && !!b && a.type === b.type && a.color === b.color;

const getDisplayPosition = (square: string, orientation: 'w' | 'b') => {
  const fileIndex = COLUMNS.indexOf(square[0]);
  const rank = parseInt(square[1], 10);
  const boardCol = orientation === 'b' ? 7 - fileIndex : fileIndex;
  const boardRow = orientation === 'b' ? rank - 1 : 8 - rank;
  return { x: boardCol * 12.5, y: boardRow * 12.5 };
};

const isPieceAnimationScopeAllowed = (
  scope: 'all' | 'my-pieces' | 'opponent-pieces' | 'white-pieces' | 'black-pieces',
  movedColor: 'w' | 'b',
  controlMode: 'w' | 'b' | 'both'
) => {
  if (scope === 'all') return true;
  if (scope === 'white-pieces') return movedColor === 'w';
  if (scope === 'black-pieces') return movedColor === 'b';
  if (scope === 'my-pieces') return controlMode === 'both' || movedColor === controlMode;
  if (scope === 'opponent-pieces') return controlMode === 'both' || movedColor !== controlMode;
  return true;
};

const ChessBoard: React.FC<ChessBoardProps> = ({ orientation = 'w', controlMode = 'both' }) => {
  const gameContext = useGame();
  const { settings } = useSettings();

  if (!gameContext || !settings || !settings.template) return <div>Loading Engine...</div>;
  const { engine, viewFen, makeMove, isViewingCurrent, analysis, analysisPerspective, multiplayer, gameState } = gameContext;
  
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [pressureMap, setPressureMap] = useState<SquarePressureMap>({});
  const [activePathSources, setActivePathSources] = useState<PressureSource[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);
  const [illegalMoveMsg, setIllegalMoveMsg] = useState<string | null>(null);
  const [movingPiece, setMovingPiece] = useState<MovingPieceAnimation | null>(null);
  const [triggeredAnimation, setTriggeredAnimation] = useState<TriggeredAnimation | null>(null);
  const previousBoardMapRef = useRef<BoardPieceMap | null>(null);
  const animationTimeoutRef = useRef<number | null>(null);
  const triggeredAnimationTimeoutRef = useRef<number | null>(null);
  const recentMoveAnimationRef = useRef<{ key: string; timestamp: number } | null>(null);

  const startMovingPieceAnimation = (sourceSquare: string, targetSquare: string, piece: BoardPiece) => {
    const animationSpeed = settings.pieceAnimations.movementSpeedMs;
    const id = Date.now();
    recentMoveAnimationRef.current = {
      key: `${sourceSquare}:${targetSquare}:${piece.type}:${piece.color}`,
      timestamp: id
    };
    if (animationTimeoutRef.current) window.clearTimeout(animationTimeoutRef.current);
    setMovingPiece({ id, from: sourceSquare, to: targetSquare, piece, started: false });
    window.requestAnimationFrame(() => {
      setMovingPiece(current => current?.id === id ? { ...current, started: true } : current);
    });
    animationTimeoutRef.current = window.setTimeout(() => {
      setMovingPiece(current => current?.id === id ? null : current);
    }, animationSpeed + 80);
  };

  const currentBoardMap = useMemo(() => {
    if (settings.isThemeEditorMode) return {};
    const board = engine.getBoardAtFen(viewFen);
    const nextMap: BoardPieceMap = {};
    if (!board) return nextMap;
    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        const piece = board[r][c];
        if (piece) nextMap[`${COLUMNS[c]}${8 - r}`] = piece;
      }
    }
    return nextMap;
  }, [engine, settings.isThemeEditorMode, viewFen]);

  useEffect(() => {
    try {
      const tempGame = new Chess(viewFen);
      setPressureMap(calculatePressureMap(tempGame));
    } catch (e) {
      console.error('Error calculating pressure map:', e);
    }
  }, [viewFen]);

  useEffect(() => () => {
    if (animationTimeoutRef.current) window.clearTimeout(animationTimeoutRef.current);
    if (triggeredAnimationTimeoutRef.current) window.clearTimeout(triggeredAnimationTimeoutRef.current);
  }, []);

  useEffect(() => {
    const handler = (event: any) => {
      const payload = event.payload;
      if (!payload?.animation) return;
      const target = payload.target as string;
      const square = target === 'source-square'
        ? payload.from
        : target === 'target-square' || target === 'moved-piece' || target === 'captured-piece'
          ? payload.to
          : undefined;
      const id = Date.now();
      setTriggeredAnimation({
        id,
        animation: payload.animation,
        target,
        square,
        message: payload.eventName
      });
      if (triggeredAnimationTimeoutRef.current) window.clearTimeout(triggeredAnimationTimeoutRef.current);
      triggeredAnimationTimeoutRef.current = window.setTimeout(() => {
        setTriggeredAnimation(current => current?.id === id ? null : current);
      }, Math.max(180, (payload.animation.durationMs || 300) + (payload.animation.delayMs || 0) + 120));
    };
    eventBus.subscribe('animation.play', handler);
    return () => eventBus.unsubscribe('animation.play', handler);
  }, []);

  useEffect(() => {
    const handler = (event: any) => {
      const payload = (event?.payload ?? {}) as MoveAnimationPayload;
      if (settings.isThemeEditorMode || !settings.pieceAnimations.enabled) return;
      if (!payload.from || !payload.to) return;

      const movedColor: 'w' | 'b' = payload.team === 'b' || payload.team === 'black' ? 'b' : 'w';
      if (!isPieceAnimationScopeAllowed(settings.pieceAnimations.movementScope ?? 'all', movedColor, controlMode)) return;

      const pieceType = payload.pieceType ?? 'p';
      const moveKey = `${payload.from}:${payload.to}:${pieceType}:${movedColor}`;
      if (recentMoveAnimationRef.current && recentMoveAnimationRef.current.key === moveKey && Date.now() - recentMoveAnimationRef.current.timestamp < Math.max(180, settings.pieceAnimations.movementSpeedMs + 120)) {
        return;
      }

      startMovingPieceAnimation(payload.from, payload.to, { type: pieceType, color: movedColor });
    };

    eventBus.subscribe('move.made', handler);
    return () => eventBus.unsubscribe('move.made', handler);
  }, [settings.isThemeEditorMode, settings.pieceAnimations.enabled, settings.pieceAnimations.movementScope, settings.pieceAnimations.movementSpeedMs, controlMode]);

  useEffect(() => {
    const previousBoardMap = previousBoardMapRef.current;
    previousBoardMapRef.current = currentBoardMap;

    if (!previousBoardMap || settings.isThemeEditorMode || !settings.pieceAnimations.enabled) {
      setMovingPiece(null);
      return;
    }

    const changedToSquares = Object.entries(currentBoardMap)
      .filter(([square, piece]) => !piecesMatch(previousBoardMap[square], piece))
      .map(([square, piece]) => ({ square, piece }));
    const changedFromSquares = Object.entries(previousBoardMap)
      .filter(([square, piece]) => !piecesMatch(currentBoardMap[square], piece))
      .map(([square, piece]) => ({ square, piece }));
    const target = changedToSquares.find(({ piece }) =>
      changedFromSquares.some(source => source.piece.color === piece.color)
    );
    const source = target
      ? changedFromSquares.find(({ piece }) => piece.color === target.piece.color && (piece.type === target.piece.type || piece.type === 'p'))
      : null;

    if (!target || !source || source.square === target.square) {
      setMovingPiece(null);
      return;
    }

    const wasCapture = !!previousBoardMap[target.square] && previousBoardMap[target.square]?.color !== target.piece.color;
    const wasPromotion = source.piece.type !== target.piece.type;
    if ((wasCapture && !settings.pieceAnimations.captureAnimation) || (wasPromotion && !settings.pieceAnimations.promotionAnimation)) {
      setMovingPiece(null);
      return;
    }

    const scope = settings.pieceAnimations.movementScope ?? 'all';
    const movedColor: 'w' | 'b' = target.piece.color === 'b' ? 'b' : 'w';
    const scopeAllowsAnimation = isPieceAnimationScopeAllowed(scope, movedColor, controlMode);
    if (!scopeAllowsAnimation) {
      setMovingPiece(null);
      return;
    }

    const moveKey = `${source.square}:${target.square}:${source.piece.type}:${target.piece.color}`;
    if (recentMoveAnimationRef.current && recentMoveAnimationRef.current.key === moveKey && Date.now() - recentMoveAnimationRef.current.timestamp < Math.max(180, settings.pieceAnimations.movementSpeedMs + 120)) {
      return;
    }

    startMovingPieceAnimation(source.square, target.square, target.piece);
  }, [currentBoardMap, settings.isThemeEditorMode, settings.pieceAnimations, controlMode]);

  const legalMoves = useMemo(() => {
    if (!selectedSquare || !isViewingCurrent || settings.isThemeEditorMode) return [];
    return engine.getLegalMoves(selectedSquare).map((m: any) => m.to);
  }, [engine, selectedSquare, isViewingCurrent, settings.isThemeEditorMode]);

  const showIllegalMove = (reason: string) => {
    setIllegalMoveMsg(reason);
    setTimeout(() => setIllegalMoveMsg(null), 2000);
  };

  const onSquareClick = (square: string) => {
    if (settings.isThemeEditorMode) {
      setSelectedSquare(square);
      
      const EDITOR_LAYOUT: Record<string, string> = {
        'a8': 'wr', 'b8': 'wn', 'c8': 'wb', 'd8': 'wq', 'e8': 'wk', 'f8': 'wp',
        'a7': 'br', 'b7': 'bn', 'c7': 'bb', 'd7': 'bq', 'e7': 'bk', 'f7': 'bp'
      };
      
      if (EDITOR_LAYOUT[square]) {
        window.dispatchEvent(new CustomEvent('chess-piece-selected', { detail: EDITOR_LAYOUT[square] }));
      }
      return;
    }

    if (!isViewingCurrent) return;

    if (selectedSquare === null) {
      const piece = engine.getPiece(square);
      if (piece && piece.color === engine.getGameState().turn) {
        // Enforce Control Mode
        if (controlMode !== 'both' && piece.color !== controlMode) {
          showIllegalMove(`Mode restricted: Play as ${controlMode === 'w' ? 'White' : 'Black'}`);
          return;
        }
        setSelectedSquare(square);
      }
    } else {
      const moves = engine.getLegalMoves(selectedSquare);
      const move = moves.find((m: any) => m.to === square);

      if (!move) {
        const pieceAtTarget = engine.getPiece(square);
        if (pieceAtTarget && pieceAtTarget.color === engine.getGameState().turn) {
          // Enforce Control Mode for re-selection
          if (controlMode !== 'both' && pieceAtTarget.color !== controlMode) {
             showIllegalMove(`Mode restricted: Play as ${controlMode === 'w' ? 'White' : 'Black'}`);
             setSelectedSquare(null);
             return;
          }
          setSelectedSquare(square);
        } else {
          showIllegalMove("Illegal move");
          setSelectedSquare(null);
        }
        return;
      }

      if (move.flags.includes('p')) {
        setPendingPromotion({ from: selectedSquare, to: square });
        return;
      }

      makeMove({
        from: selectedSquare,
        to: square,
        promotion: 'q',
      });

      setSelectedSquare(null);
    }
  };

  const handlePromotionSelect = (piece: string) => {
    if (!pendingPromotion) return;
    makeMove({
      from: pendingPromotion.from,
      to: pendingPromotion.to,
      promotion: piece,
    });
    setPendingPromotion(null);
    setSelectedSquare(null);
  };

  const squares = useMemo(() => {
    const arr = [];
    const rows = [0, 1, 2, 3, 4, 5, 6, 7];
    const cols = [0, 1, 2, 3, 4, 5, 6, 7];

    if (orientation === 'b') {
      rows.reverse();
      cols.reverse();
    }
    
    const EDITOR_LAYOUT: Record<string, { type: string; color: string }> = {
      'a8': { type: 'r', color: 'w' }, 'b8': { type: 'n', color: 'w' }, 'c8': { type: 'b', color: 'w' }, 'd8': { type: 'q', color: 'w' }, 'e8': { type: 'k', color: 'w' }, 'f8': { type: 'p', color: 'w' },
      'a7': { type: 'r', color: 'b' }, 'b7': { type: 'n', color: 'b' }, 'c7': { type: 'b', color: 'b' }, 'd7': { type: 'q', color: 'b' }, 'e7': { type: 'k', color: 'b' }, 'f7': { type: 'p', color: 'b' }
    };

    for (const r of rows) {
      for (const c of cols) {
        const squareName = `${COLUMNS[c]}${8 - r}`;
        const piece = settings.isThemeEditorMode ? EDITOR_LAYOUT[squareName] : (currentBoardMap[squareName] ?? null);
        const pressure = settings.isThemeEditorMode ? { white: [], black: [] } : (pressureMap[squareName] || { white: [], black: [] });
        const isDark = (r + c) % 2 === 1;

        arr.push(
          <Square
            key={squareName}
            square={squareName}
            piece={piece}
            isDark={isDark}
            whitePressure={pressure.white}
            blackPressure={pressure.black}
            activePathSources={activePathSources}
            onSquareClick={onSquareClick}
            onBadgeHover={setActivePathSources}
            onBadgeLeave={() => setActivePathSources([])}
            isSelected={selectedSquare === squareName}
            isMoveTarget={legalMoves.includes(squareName)}
            hidePiece={movingPiece?.to === squareName}
          />
        );
      }
    }
    return arr;
  }, [currentBoardMap, pressureMap, activePathSources, selectedSquare, legalMoves, settings.template, settings.isThemeEditorMode, orientation, movingPiece?.to]);

  const { boardColors, boardOverlay } = settings.template;
  const getTriggeredAnimationName = (preset: string) => `event-animation-${preset}`;
  const renderTriggeredAnimation = () => {
    if (!triggeredAnimation) return null;
    const { animation, target, square } = triggeredAnimation;
    const isBoardTarget = target === 'board' || animation.targetType === 'board' || animation.preset === 'board-flash';
    const squarePosition = square ? getDisplayPosition(square, orientation) : { x: 43.75, y: 43.75 };
    const animationStyle = `${getTriggeredAnimationName(animation.preset)} ${Math.max(80, animation.durationMs || 300)}ms ${animation.easing || 'ease-in-out'} ${animation.delayMs || 0}ms ${animation.repeatCount || 1}`;

    if (isBoardTarget) {
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 45,
            borderRadius: '4px',
            animation: animationStyle
          }}
        />
      );
    }

    return (
      <div
        style={{
          position: 'absolute',
          left: `calc(10px + ${squarePosition.x}%)`,
          top: `calc(10px + ${squarePosition.y}%)`,
          width: 'calc((100% - 20px) / 8)',
          height: 'calc((100% - 20px) / 8)',
          pointerEvents: 'none',
          zIndex: 46,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: animationStyle
        }}
      >
        <div style={{ width: '62%', height: '62%', borderRadius: '999px', border: '3px solid rgba(79,70,229,0.8)', background: 'rgba(79,70,229,0.12)' }} />
      </div>
    );
  };

  // Analysis display calculation
  const effectiveColor = analysisPerspective === 'you' ? (multiplayer.playerColor || gameState.turn) : analysisPerspective;
  const perspectiveLabel = effectiveColor === 'w' ? 'White' : 'Black';
  const displayScore = (score: number) => effectiveColor === 'b' ? -score : score;

  return (
    <div style={{ position: 'relative' }}>
      <style>{`
        @keyframes event-animation-snap { from { opacity: 0.9; } to { opacity: 0; } }
        @keyframes event-animation-slide { from { transform: translateX(-18px); opacity: 0.3; } to { transform: translateX(0); opacity: 1; } }
        @keyframes event-animation-fast-slide { from { transform: translateX(-24px); opacity: 0.3; } to { transform: translateX(0); opacity: 1; } }
        @keyframes event-animation-bounce { 0% { transform: scale(0.7); } 55% { transform: scale(1.25); } 100% { transform: scale(1); } }
        @keyframes event-animation-hop { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-18px); } }
        @keyframes event-animation-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
        @keyframes event-animation-pulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.35); opacity: 1; } }
        @keyframes event-animation-capture-pop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.35); opacity: 1; } 100% { transform: scale(1); opacity: 0.75; } }
        @keyframes event-animation-promotion-glow { 0%, 100% { box-shadow: 0 0 0 rgba(250,204,21,0); } 50% { box-shadow: 0 0 26px rgba(250,204,21,0.95); } }
        @keyframes event-animation-board-flash { 0%, 100% { background: rgba(250,204,21,0); } 50% { background: rgba(250,204,21,0.32); } }
      `}</style>
      {/* Engine Assist UI Overlay */}
      {settings.trainingWheels && !settings.isThemeEditorMode && (
        <div style={{
          position: 'absolute',
          top: '-15px',
          right: '-160px',
          width: '140px',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '10px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          fontSize: '0.75rem',
          zIndex: 50,
          border: '1px solid #ddd'
        }}>
          <div style={{ fontWeight: 'bold', borderBottom: '1px solid #eee', marginBottom: '5px', paddingBottom: '3px' }}>{perspectiveLabel} Assist</div>
          <div style={{ marginBottom: '8px' }}>
            Score: <span style={{ fontWeight: 'bold', color: displayScore(analysis.evaluation) >= 0 ? '#27ae60' : '#e74c3c' }}>
              {displayScore(analysis.evaluation) > 0 ? '+' : ''}{displayScore(analysis.evaluation).toFixed(1)}
            </span>
          </div>
          <div>
            <div style={{ color: '#888', marginBottom: '3px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Rec. Moves:</span>
              {gameContext.previewLine && (
                <button onClick={() => gameContext.setPreviewLine(null)} style={{ fontSize: '0.6rem', padding: '0 3px', cursor: 'pointer' }}>⨯</button>
              )}
            </div>
            {analysis.topLines.map((item: any, i: number) => (
              <div 
                key={i} 
                onClick={() => gameContext.setPreviewLine(item.line)}
                style={{ 
                  marginBottom: '4px', 
                  padding: '3px',
                  background: gameContext.previewLine === item.line ? '#e3f2fd' : 'transparent',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  border: gameContext.previewLine === item.line ? '1px solid #2196f3' : '1px solid transparent'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span>{i + 1}. {item.move.san}</span>
                  <span style={{ color: displayScore(item.score) >= 0 ? '#27ae60' : '#e74c3c' }}>({displayScore(item.score) > 0 ? '+' : ''}{displayScore(item.score).toFixed(1)})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className="board-container"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          width: 'min(90vw, 600px)',
          border: `10px solid ${boardColors.dark}`,
          borderRadius: '8px',
          margin: '20px auto',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          position: 'relative',
          backgroundImage: boardOverlay.image ? `url(${boardOverlay.image})` : 'none',
          backgroundSize: 'cover',
          backgroundColor: boardColors.dark
        }}
      >
        {squares}
        {movingPiece && (() => {
          const from = getDisplayPosition(movingPiece.from, orientation);
          const to = getDisplayPosition(movingPiece.to, orientation);
          const x = movingPiece.started ? to.x : from.x;
          const y = movingPiece.started ? to.y : from.y;

          return (
            <div
              key={movingPiece.id}
              style={{
                position: 'absolute',
                left: `calc(10px + ${x}%)`,
                top: `calc(10px + ${y}%)`,
                width: 'calc((100% - 20px) / 8)',
                height: 'calc((100% - 20px) / 8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 40,
                transition: `left ${settings.pieceAnimations.movementSpeedMs}ms ${settings.pieceAnimations.easing}, top ${settings.pieceAnimations.movementSpeedMs}ms ${settings.pieceAnimations.easing}`
              }}
            >
              <div style={{ width: '85%', height: '85%' }}>
                <Piece type={movingPiece.piece.type} color={movingPiece.piece.color} comfort={0} />
              </div>
            </div>
          );
        })()}
        {renderTriggeredAnimation()}
      </div>

      {illegalMoveMsg && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#ff5252',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '0.9rem',
          fontWeight: 'bold',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>⚠</span> {illegalMoveMsg}
        </div>
      )}

      {pendingPromotion && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          zIndex: 100,
          textAlign: 'center'
        }}>
          <h4 style={{ margin: '0 0 15px 0' }}>Promote Pawn</h4>
          <div style={{ display: 'flex', gap: '10px' }}>
            {['q', 'r', 'b', 'n'].map((p) => (
              <button 
                key={p}
                onClick={() => handlePromotionSelect(p)}
                style={{
                  padding: '10px',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  background: '#fff',
                  width: '50px'
                }}
              >
                {p === 'q' ? '♕' : p === 'r' ? '♖' : p === 'b' ? '♗' : '♘'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChessBoard;
