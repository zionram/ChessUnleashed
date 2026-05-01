import type { TimeControlConfig, TimerColor, TimerState } from './TimerTypes';

export const createInitialTimerState = (
  config: TimeControlConfig,
  activeColor: TimerColor = 'w'
): TimerState => ({
  whiteTimeSeconds: config.initialTimeSeconds,
  blackTimeSeconds: config.initialTimeSeconds,
  activeColor,
  isRunning: false
});

export const startTimerState = (state: TimerState, config: TimeControlConfig): TimerState => ({
  ...state,
  isRunning: config.enabled
});

export const stopTimerState = (state: TimerState): TimerState => ({
  ...state,
  isRunning: false
});

export const tickTimerState = (state: TimerState, elapsedSeconds = 1): TimerState => {
  if (!state.isRunning) return state;

  if (state.activeColor === 'w') {
    const whiteTimeSeconds = Math.max(0, state.whiteTimeSeconds - elapsedSeconds);
    return {
      ...state,
      whiteTimeSeconds,
      isRunning: whiteTimeSeconds > 0
    };
  }

  const blackTimeSeconds = Math.max(0, state.blackTimeSeconds - elapsedSeconds);
  return {
    ...state,
    blackTimeSeconds,
    isRunning: blackTimeSeconds > 0
  };
};

export const applyMoveTimeUpdateState = (
  state: TimerState,
  config: TimeControlConfig,
  movingColor: TimerColor,
  nextActiveColor: TimerColor
): TimerState => {
  const incrementSeconds = config.mode === 'standard' ? config.incrementSeconds : 0;

  return {
    whiteTimeSeconds: movingColor === 'w'
      ? state.whiteTimeSeconds + incrementSeconds
      : state.whiteTimeSeconds,
    blackTimeSeconds: movingColor === 'b'
      ? state.blackTimeSeconds + incrementSeconds
      : state.blackTimeSeconds,
    activeColor: nextActiveColor,
    isRunning: config.enabled
  };
};
