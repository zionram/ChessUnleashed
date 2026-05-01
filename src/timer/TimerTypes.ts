export type TimerMode = 'standard';
export type TimerColor = 'w' | 'b';
export type TimerPlacement = 'top' | 'left' | 'right' | 'right-panel';
export type TimerBehavior = 'static' | 'draggable';

export interface TimeControlConfig {
  enabled: boolean;
  initialTimeSeconds: number;
  incrementSeconds: number;
  mode: TimerMode;
  placement: TimerPlacement;
  manualClockPress: boolean;
  behavior: TimerBehavior;
  draggablePosition?: {
    x: number;
    y: number;
  };
}

export interface TimerState {
  whiteTimeSeconds: number;
  blackTimeSeconds: number;
  activeColor: TimerColor;
  isRunning: boolean;
}
