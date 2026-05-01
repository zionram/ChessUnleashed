import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';

const PathsView: React.FC = () => {
  const { settings, updateTemplate } = useSettings();
  const { pathStyle } = settings.template;
  const [selectedPieceType, setSelectedPieceType] = useState('p');

  const PIECE_NAMES: Record<string, string> = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' };

  const updateColor = (color: string) => {
    updateTemplate({ pathStyle: { ...pathStyle, colors: { ...pathStyle.colors, [selectedPieceType]: color } } });
  };

  const updateIcon = (icon: any) => {
    updateTemplate({ pathStyle: { ...pathStyle, icon } });
  };

  return (
    <div className="view-container">
      <section style={{ marginBottom: '15px' }}>
        <h4 style={{ fontSize: '0.85rem' }}>Style</h4>
        <select value={pathStyle.icon} onChange={(e) => updateIcon(e.target.value)} style={{ width: '100%', padding: '5px' }}>
            <option value="dot">Icon: Dot (●)</option>
            <option value="diamond">Icon: Diamond (◆)</option>
            <option value="square">Icon: Square (■)</option>
        </select>
      </section>

      <section>
        <h4 style={{ fontSize: '0.85rem' }}>Piece Colors</h4>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <select value={selectedPieceType} onChange={(e) => setSelectedPieceType(e.target.value)} style={{ flex: 1, padding: '5px' }}>
              {Object.entries(PIECE_NAMES).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>
            <input type="color" value={pathStyle.colors[selectedPieceType]} onChange={(e) => updateColor(e.target.value)} />
        </div>
      </section>
    </div>
  );
};

export default PathsView;
