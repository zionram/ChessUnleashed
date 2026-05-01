import React, { useState, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';
import Square from './Square';
import { calculatePressureMap, type SquarePressureMap, type PressureSource } from '../../utils/pressureEngine';
import { useGame } from '../../context/GameContext';
import { useSettings } from '../../context/SettingsContext';

interface ChessBoardProps {
  onPieceSelect?: (pieceKey: string) => void;
  orientation?: 'w' | 'b';
  controlMode?: 'w' | 'b' | 'both';
}

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

  useEffect(() => {
    try {
      const tempGame = new Chess(viewFen);
      setPressureMap(calculatePressureMap(tempGame));
    } catch (e) {
      console.error('Error calculating pressure map:', e);
    }
  }, [viewFen]);

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
    const COLUMNS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
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

    const board = settings.isThemeEditorMode ? null : engine.getBoardAtFen(viewFen);

    for (const r of rows) {
      for (const c of cols) {
        const squareName = `${COLUMNS[c]}${8 - r}`;
        const piece = settings.isThemeEditorMode ? EDITOR_LAYOUT[squareName] : (board ? board[r][c] : null);
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
          />
        );
      }
    }
    return arr;
  }, [viewFen, pressureMap, activePathSources, selectedSquare, legalMoves, settings.template, settings.isThemeEditorMode, engine, orientation]);

  const { boardColors, boardOverlay } = settings.template;

  // Analysis display calculation
  const effectiveColor = analysisPerspective === 'you' ? (multiplayer.playerColor || gameState.turn) : analysisPerspective;
  const perspectiveLabel = effectiveColor === 'w' ? 'White' : 'Black';
  const displayScore = (score: number) => effectiveColor === 'b' ? -score : score;

  return (
    <div style={{ position: 'relative' }}>
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
