import React from 'react';
import type { GameState } from '../../engines/BaseEngine';
import type { TimerColor } from '../../timer/TimerTypes';
import { useSettings } from '../../context/SettingsContext';
import { useGame } from '../../context/GameContext';

interface TimeoutResult {
  loser: TimerColor;
  winner: TimerColor;
}

interface ResignationResult {
  loser: TimerColor;
  winner: TimerColor;
}

interface GameEndOverlayProps {
  gameState: GameState;
  timeoutResult: TimeoutResult | null;
  resignationResult: ResignationResult | null;
  playerColor: TimerColor | null;
  onRematch: () => void;
  onNewGame: () => void;
  onDismiss: () => void;
}

const GameEndOverlay: React.FC<GameEndOverlayProps> = ({
  gameState,
  timeoutResult,
  resignationResult,
  playerColor,
  onRematch,
  onNewGame,
  onDismiss
}) => {
  const { settings } = useSettings();
  const { multiplayer } = useGame();
  const { localProfile } = settings;

  const getPlayerName = (color: 'w' | 'b') => {
    if (multiplayer.vsComputer) {
      if (color === multiplayer.computerSide) return multiplayer.opponentProfile.name;
      return localProfile.displayName || 'Guest Player';
    }
    if (multiplayer.isConnected) {
      if (color === multiplayer.playerColor) return localProfile.displayName || 'Guest Player';
      return color === 'w' ? 'White' : 'Black';
    }
    if (color === 'w') return localProfile.displayName || 'Guest Player';
    return 'Local Player';
  };

  const winner = timeoutResult
    ? timeoutResult.winner
    : resignationResult
      ? resignationResult.winner
    : gameState.isCheckmate
      ? (gameState.turn === 'w' ? 'b' : 'w')
      : null;

  const resultType = timeoutResult
    ? 'timeout'
    : resignationResult
      ? 'resignation'
    : gameState.isCheckmate
      ? 'checkmate'
      : 'draw';

  const heading = winner
    ? `${getPlayerName(winner)} won!`
    : 'Draw!';

  const reason = resultType === 'timeout'
    ? 'Timeout'
    : resultType === 'resignation'
      ? 'Resignation'
    : resultType === 'checkmate'
      ? 'Checkmate'
      : 'Draw';

  const icon = resultType === 'resignation'
    ? '!'
    : resultType === 'timeout'
    ? '⏰'
    : resultType === 'checkmate'
      ? (winner === playerColor ? '🏆' : '💀')
      : '🤝';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 8,
        pointerEvents: 'none'
      }}
    >
      <div
        style={{
          pointerEvents: 'auto',
          width: 'min(92vw, 360px)',
          background: 'rgba(255, 255, 255, 0.94)',
          border: '1px solid rgba(44, 62, 80, 0.18)',
          borderRadius: 12,
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18)',
          backdropFilter: 'blur(8px)',
          padding: '22px',
          textAlign: 'center'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
          <button
            onClick={onDismiss}
            aria-label="Dismiss game end overlay"
            style={{
              border: 'none',
              background: 'transparent',
              color: '#5d6d7e',
              cursor: 'pointer',
              fontSize: '1rem',
              lineHeight: 1,
              padding: 0
            }}
          >
            ×
          </button>
        </div>
        {/* TODO: make icon/text/template styling event-driven and theme-driven later. */}
        <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>{icon}</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2c3e50', marginBottom: '6px' }}>{heading}</div>
        <div style={{ fontSize: '0.9rem', color: '#5d6d7e', marginBottom: '18px' }}>{reason}</div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={onRematch}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #2c3e50',
              background: '#2c3e50',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            Rematch
          </button>
          <button
            onClick={onNewGame}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #bdc3c7',
              background: '#f8f9fa',
              color: '#2c3e50',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            New Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameEndOverlay;
