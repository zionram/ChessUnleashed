import type { ConfigValidator } from '../ConfigValidationTypes';

export const validateTimerConfig: ConfigValidator = ({ settings }) => {
  const { timeControl } = settings;

  if (timeControl.behavior === 'draggable' && timeControl.placement === 'right-panel') {
    return [{
      severity: 'error',
      message: 'Draggable timer behavior requires a board-area timer placement.',
      affectedSettingPaths: ['timeControl.behavior', 'timeControl.placement'],
      suggestedFix: 'Set timer placement to top, left, or right, or set timer movement to static.'
    }];
  }

  return [];
};
