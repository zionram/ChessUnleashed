import React, { useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { getRegisteredSettingsField } from '../registry/SettingsRegistry';
import { validateConfig } from '../validation/ConfigValidationRegistry';

const placementField = getRegisteredSettingsField('timer.placement');
const behaviorField = getRegisteredSettingsField('timer.behavior');
const MIN_INITIAL_TIME_SECONDS = 3;

const TimerSettingsView: React.FC = () => {
  const { settings, updateTimeControl } = useSettings();
  const { enabled, initialTimeSeconds, incrementSeconds, placement, manualClockPress, behavior } = settings.timeControl;
  const clampedInitialTimeSeconds = Math.max(MIN_INITIAL_TIME_SECONDS, initialTimeSeconds);
  const initialMinutes = Math.floor(clampedInitialTimeSeconds / 60);
  const initialSeconds = +(clampedInitialTimeSeconds - initialMinutes * 60).toFixed(1);
  const validationErrors = useMemo(
    () => validateConfig({ settings }).issues.filter(issue => issue.severity === 'error'),
    [settings]
  );
  const getFieldErrors = (settingsPath: string) =>
    validationErrors.filter(issue => issue.affectedSettingPaths.includes(settingsPath));
  const placementErrors = getFieldErrors(placementField?.settingsPath ?? 'timeControl.placement');
  const behaviorErrors = getFieldErrors(behaviorField?.settingsPath ?? 'timeControl.behavior');
  const warningStyle: React.CSSProperties = { color: '#c0392b', fontSize: '0.7rem', marginTop: '4px' };
  const showDraggablePlacementFix = validationErrors.some(issue =>
    issue.affectedSettingPaths.includes('timeControl.behavior') &&
    issue.affectedSettingPaths.includes('timeControl.placement')
  );
  const fixDraggablePlacement = () => updateTimeControl({ placement: 'top' });
  const updateInitialTimePart = (nextMinutes: number, nextSeconds: number) => {
    const boundedMinutes = Math.max(0, Math.floor(nextMinutes));
    const boundedSeconds = Math.max(0, Math.min(59.9, nextSeconds));
    const totalSeconds = Math.max(
      MIN_INITIAL_TIME_SECONDS,
      +(boundedMinutes * 60 + boundedSeconds).toFixed(1)
    );
    updateTimeControl({ initialTimeSeconds: totalSeconds });
  };

  return (
    <div className="view-container cu-view-shell">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
          <span>Enable Timer</span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => updateTimeControl({ enabled: e.target.checked })}
          />
        </label>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
          <span style={{ fontSize: '0.85rem' }}>Initial Time ({clampedInitialTimeSeconds.toFixed(1).replace('.0', '')}s)</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* TODO: timer input layout can become template/config driven later. */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: '#666' }}>
              <span>Minutes</span>
              <input
                type="number"
                min="0"
                max="180"
                step="1"
                value={initialMinutes}
                onChange={(e) => updateInitialTimePart(parseInt(e.target.value, 10) || 0, initialSeconds)}
                style={{ width: '58px', padding: '4px', fontSize: '0.8rem' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: '#666' }}>
              <span>Seconds</span>
              <input
                type="number"
                min="0"
                max="59.9"
                step="0.1"
                value={initialSeconds}
                onChange={(e) => updateInitialTimePart(initialMinutes, parseFloat(e.target.value) || 0)}
                style={{ width: '64px', padding: '4px', fontSize: '0.8rem' }}
              />
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem' }}>Increment ({incrementSeconds}s)</span>
          <input
            type="number"
            min="0"
            max="60"
            step="1"
            value={incrementSeconds}
            onChange={(e) => updateTimeControl({ incrementSeconds: Math.max(0, parseInt(e.target.value) || 0) })}
            style={{ width: '70px', padding: '4px', fontSize: '0.8rem' }}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem' }}>Timer Placement</span>
            <select
              value={placement}
              onChange={(e) => updateTimeControl({ placement: e.target.value as 'top' | 'left' | 'right' | 'right-panel' })}
              style={{ padding: '4px', fontSize: '0.8rem' }}
            >
              <option value="top">Top</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
              <option value="right-panel">Right Panel</option>
            </select>
          </div>
          {placementErrors.map(issue => (
            <div key={issue.message} style={{ ...warningStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{issue.message}</span>
              {showDraggablePlacementFix && (
                <button
                  onClick={fixDraggablePlacement}
                  style={{ padding: '2px 6px', fontSize: '0.65rem', cursor: 'pointer' }}
                >
                  Fix
                </button>
              )}
            </div>
          ))}
        </div>

        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
          <span>Manual Clock Press</span>
          <input
            type="checkbox"
            checked={manualClockPress}
            onChange={(e) => updateTimeControl({ manualClockPress: e.target.checked })}
          />
        </label>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem' }}>Timer Movement</span>
            <select
              value={behavior}
              onChange={(e) => updateTimeControl({ behavior: e.target.value as 'static' | 'draggable' })}
              style={{ padding: '4px', fontSize: '0.8rem' }}
            >
              <option value="static">Static</option>
              <option value="draggable">Draggable</option>
            </select>
          </div>
          {behaviorErrors.map(issue => (
            <div key={issue.message} style={{ ...warningStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{issue.message}</span>
              {showDraggablePlacementFix && (
                <button
                  onClick={fixDraggablePlacement}
                  style={{ padding: '2px 6px', fontSize: '0.65rem', cursor: 'pointer' }}
                >
                  Fix
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      <p style={{ fontSize: '0.7rem', color: '#666', marginTop: '10px' }}>
        Configure basic game clock behavior. Timer visuals are controlled by the active template.
      </p>
    </div>
  );
};

export default TimerSettingsView;
