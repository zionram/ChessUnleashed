import React, { useMemo, useRef, useState } from 'react';

type WaveProgressBarProps = {
  progress: number;
  duration: number;
  isPlaying: boolean;
  accentColor?: string;
  disabled?: boolean;
  unavailableLabel?: string;
  onSeek: (seconds: number) => void;
};

const BAR_PATTERN = [34, 68, 52, 82, 44, 74, 58, 90, 48, 72, 38, 64, 84, 50, 76, 42, 70, 56, 88, 46, 66, 36, 80, 54];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
};

const WaveProgressBar: React.FC<WaveProgressBarProps> = ({
  progress,
  duration,
  isPlaying,
  accentColor = '#3498db',
  disabled = false,
  unavailableLabel = 'Waveform unavailable for this file.',
  onSeek
}) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const canSeek = !disabled && Number.isFinite(duration) && duration > 0;
  const progressRatio = useMemo(() => {
    if (!canSeek) return 0;
    return clamp(progress / duration, 0, 1);
  }, [canSeek, duration, progress]);

  const seekFromClientX = (clientX: number) => {
    if (!canSeek) return;
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    onSeek(duration * ratio);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canSeek) return;
    setIsSeeking(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    seekFromClientX(event.clientX);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isSeeking) return;
    seekFromClientX(event.clientX);
  };

  const stopSeeking = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsSeeking(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4, fontSize: '0.6rem', opacity: 0.74 }}>
        <span>Current {formatTime(progress)}</span>
        <span>Duration {formatTime(duration)}</span>
      </div>
      <div
        ref={barRef}
        role="slider"
        aria-label="Music progress"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, duration)}
        aria-valuenow={clamp(progress, 0, Math.max(0, duration))}
        aria-disabled={!canSeek}
        tabIndex={canSeek ? 0 : -1}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopSeeking}
        onPointerCancel={stopSeeking}
        onKeyDown={(event) => {
          if (!canSeek) return;
          if (event.key === 'ArrowLeft') onSeek(clamp(progress - 5, 0, duration));
          if (event.key === 'ArrowRight') onSeek(clamp(progress + 5, 0, duration));
        }}
        style={{
          display: 'flex',
          alignItems: 'end',
          gap: 3,
          height: 38,
          padding: '5px 4px',
          borderRadius: 7,
          border: '1px solid rgba(0,0,0,0.08)',
          background: 'rgba(255,255,255,0.55)',
          cursor: canSeek ? 'pointer' : 'default',
          opacity: canSeek ? 1 : 0.62,
          userSelect: 'none',
          touchAction: 'none'
        }}
      >
        {BAR_PATTERN.map((height, index) => {
          const barRatio = (index + 1) / BAR_PATTERN.length;
          const filled = barRatio <= progressRatio;
          return (
            <div
              key={index}
              style={{
                flex: 1,
                height: `${height}%`,
                minWidth: 2,
                borderRadius: 2,
                background: filled ? accentColor : '#c7ced6',
                opacity: filled ? (isPlaying ? 0.95 : 0.72) : 0.42,
                transition: isSeeking ? 'none' : 'background 120ms ease, opacity 120ms ease'
              }}
            />
          );
        })}
      </div>
      {!canSeek && (
        <div style={{ fontSize: '0.58rem', opacity: 0.64, marginTop: 4 }}>
          {unavailableLabel}
        </div>
      )}
    </div>
  );
};

export default WaveProgressBar;
