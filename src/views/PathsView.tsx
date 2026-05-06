import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';

const PIECE_NAMES: Record<string, string> = {
  p: 'Pawn',
  n: 'Knight',
  b: 'Bishop',
  r: 'Rook',
  q: 'Queen',
  k: 'King'
};

const PathsView: React.FC = () => {
  const { settings, updateTemplate } = useSettings();
  const { pathStyle } = settings.template;
  const [selectedPieceType, setSelectedPieceType] = useState('p');

  const updateColor = (color: string) => {
    updateTemplate({ pathStyle: { ...pathStyle, colors: { ...pathStyle.colors, [selectedPieceType]: color } } });
  };

  const updateIcon = (icon: any) => {
    updateTemplate({ pathStyle: { ...pathStyle, icon } });
  };

  return (
    <div className="view-container cu-view-shell cu-paths-view">
      <section className="cu-panel-card">
        <h4>Style</h4>
        <label className="cu-field">
          <span>Path Icon</span>
          <select value={pathStyle.icon} onChange={(e) => updateIcon(e.target.value)}>
            <option value="dot">Dot (●)</option>
            <option value="diamond">Diamond (◆)</option>
            <option value="square">Square (■)</option>
          </select>
        </label>
      </section>

      <section className="cu-panel-card">
        <h4>Piece Colors</h4>
        <div className="cu-control-row">
          <select value={selectedPieceType} onChange={(e) => setSelectedPieceType(e.target.value)} style={{ flex: 1 }}>
            {Object.entries(PIECE_NAMES).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
          <input type="color" value={pathStyle.colors[selectedPieceType]} onChange={(e) => updateColor(e.target.value)} />
        </div>
      </section>
    </div>
  );
};

export default PathsView;
