import React from 'react';
import { useSettings } from '../context/SettingsContext';

type BoardColorKey = 'light' | 'dark' | 'selected' | 'moveTarget';

const BOARD_COLOR_FIELDS: Array<{ key: BoardColorKey; label: string; helper: string }> = [
  { key: 'light', label: 'Light', helper: 'Light square base color' },
  { key: 'dark', label: 'Dark', helper: 'Dark square base color' },
  { key: 'selected', label: 'Selected', helper: 'Selected square highlight' },
  { key: 'moveTarget', label: 'Target', helper: 'Legal move target highlight' }
];

const SquaresView: React.FC = () => {
  const { settings, updateTemplate } = useSettings();
  const { boardColors } = settings.template;

  const update = (key: BoardColorKey, value: string) => {
    updateTemplate({ boardColors: { ...boardColors, [key]: value } });
  };

  return (
    <div className="view-container cu-squares-view cu-view-shell">
      <section className="cu-panel-card cu-square-color-card">
        <div className="cu-square-color-grid">
          {BOARD_COLOR_FIELDS.map(({ key, label, helper }) => (
            <label key={key} className="cu-square-color-field">
              <span className="cu-square-color-copy">
                <strong>{label}</strong>
                <small>{helper}</small>
              </span>
              <input
                type="color"
                value={boardColors[key]}
                onChange={(e) => update(key, e.target.value)}
                aria-label={`${label} square color`}
              />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
};

export default SquaresView;
