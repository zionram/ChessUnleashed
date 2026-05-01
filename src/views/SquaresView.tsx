import React from 'react';
import { useSettings } from '../context/SettingsContext';

const SquaresView: React.FC = () => {
  const { settings, updateTemplate } = useSettings();
  const { boardColors } = settings.template;

  const update = (key: string, value: string) => {
    updateTemplate({ boardColors: { ...boardColors, [key]: value } });
  };

  return (
    <div className="view-container">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        <div className="setting-item">
          <span style={{ fontSize: '0.8rem' }}>Light</span>
          <input type="color" value={boardColors.light} onChange={(e) => update('light', e.target.value)} />
        </div>
        <div className="setting-item">
          <span style={{ fontSize: '0.8rem' }}>Dark</span>
          <input type="color" value={boardColors.dark} onChange={(e) => update('dark', e.target.value)} />
        </div>
        <div className="setting-item">
          <span style={{ fontSize: '0.8rem' }}>Selected</span>
          <input type="color" value={boardColors.selected} onChange={(e) => update('selected', e.target.value)} />
        </div>
        <div className="setting-item">
          <span style={{ fontSize: '0.8rem' }}>Target</span>
          <input type="color" value={boardColors.moveTarget} onChange={(e) => update('moveTarget', e.target.value)} />
        </div>
      </div>
    </div>
  );
};

export default SquaresView;
