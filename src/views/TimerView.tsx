import React from 'react';
import { useGame } from '../context/GameContext';
import { useSettings } from '../context/SettingsContext';

const formatTime = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

interface TimerViewProps {
  displayMode?: 'panel' | 'center' | 'side';
}

const TimerView: React.FC<TimerViewProps> = ({ displayMode = 'panel' }) => {
  const { timerState, pendingClockPress, pressClock, ficsGame } = useGame();
  const { settings } = useSettings();
  const timerAppearance = settings.template.timerAppearance;
  const isFicsClockActive = !!ficsGame;
  const displayWhiteSeconds = isFicsClockActive ? ficsGame.whiteClockSeconds : timerState.whiteTimeSeconds;
  const displayBlackSeconds = isFicsClockActive ? ficsGame.blackClockSeconds : timerState.blackTimeSeconds;
  const displayActiveColor = isFicsClockActive ? ficsGame.sideToMove : timerState.activeColor;
  const showClockButton = !isFicsClockActive && displayMode !== 'panel' && settings.timeControl.manualClockPress && !!pendingClockPress;

  const clockStyle: React.CSSProperties = {
    fontFamily: timerAppearance.fontFamily,
    fontSize: timerAppearance.fontSize,
    backgroundColor: timerAppearance.backgroundColor,
    border: `1px solid ${timerAppearance.borderColor}`,
    borderRadius: 4,
    padding: '8px 10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    width: displayMode === 'center' ? 'min(100%, 520px)' : displayMode === 'side' ? 'min(100%, 180px)' : undefined,
    boxSizing: 'border-box'
  };

  const getTimeStyle = (color: 'w' | 'b'): React.CSSProperties => ({
    color: displayActiveColor === color ? timerAppearance.activeColor : timerAppearance.inactiveColor,
    fontWeight: displayActiveColor === color ? 700 : 500
  });

  return (
    <div className="view-container" style={displayMode === 'panel' ? undefined : { alignItems: 'center', width: '100%' }}>
      <div style={clockStyle}>
        <span style={getTimeStyle('w')}>White {formatTime(displayWhiteSeconds)}</span>
        <span style={getTimeStyle('b')}>Black {formatTime(displayBlackSeconds)}</span>
      </div>
      {showClockButton && (
        <button
          onClick={pressClock}
          style={{
            fontFamily: timerAppearance.fontFamily,
            fontSize: timerAppearance.fontSize,
            backgroundColor: timerAppearance.activeColor,
            color: timerAppearance.backgroundColor,
            border: `1px solid ${timerAppearance.borderColor}`,
            borderRadius: 4,
            padding: '8px 14px',
            cursor: 'pointer'
          }}
        >
          Press Clock
        </button>
      )}
    </div>
  );
};

export default TimerView;
