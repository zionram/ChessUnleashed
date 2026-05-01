import React from 'react';
import { useSettings } from '../context/SettingsContext';

const fontOptions = [
  { label: 'System', value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: "'Courier New', monospace" }
] as const;

const PlatformAppearanceView: React.FC = () => {
  const { settings, updateUIAppearance } = useSettings();
  const {
    accentColor,
    baseFontSize,
    density,
    fontFamily,
    showTipsBoard,
    tipsRotationSeconds,
    welcomePanelColor,
    welcomePanelFrameColor,
    welcomePanelFrameMode,
    welcomeSidebarContainerColor,
    welcomeSidebarContainerFrameColor,
    welcomeSidebarContainerFrameMode
  } = settings.uiAppearance;

  return (
    <div className="view-container">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.85rem' }}>Accent Color</span>
          <input
            type="color"
            value={accentColor}
            onChange={(e) => updateUIAppearance({ accentColor: e.target.value })}
            style={{ width: '44px', height: '28px', padding: 0, border: 'none', background: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem' }}>Base Font Size ({baseFontSize}px)</span>
          <input
            type="range"
            min="12"
            max="20"
            step="1"
            value={baseFontSize}
            onChange={(e) => updateUIAppearance({ baseFontSize: parseInt(e.target.value, 10) })}
            style={{ width: '110px' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.85rem' }}>Density</span>
          <select
            value={density}
            onChange={(e) => updateUIAppearance({ density: e.target.value as 'compact' | 'comfortable' | 'spacious' })}
            style={{ padding: '4px', fontSize: '0.8rem' }}
          >
            <option value="compact">Compact</option>
            <option value="comfortable">Comfortable</option>
            <option value="spacious">Spacious</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.85rem' }}>App Font</span>
          <select
            value={fontFamily}
            onChange={(e) => updateUIAppearance({ fontFamily: e.target.value })}
            style={{ padding: '4px', fontSize: '0.8rem', maxWidth: '160px' }}
          >
            {fontOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
            Show Tips Board
            <input
              type="checkbox"
              checked={showTipsBoard}
              onChange={(e) => updateUIAppearance({ showTipsBoard: e.target.checked })}
            />
          </label>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.85rem' }}>Tip Rotation ({tipsRotationSeconds}s)</span>
            <input
              type="range"
              min="3"
              max="60"
              step="1"
              value={tipsRotationSeconds}
              onChange={(e) => updateUIAppearance({ tipsRotationSeconds: parseInt(e.target.value, 10) })}
              style={{ width: '110px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.85rem' }}>Welcome Panel Color</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="color"
                value={welcomePanelColor || '#ffffff'}
                onChange={(e) => updateUIAppearance({ welcomePanelColor: e.target.value })}
                style={{ width: '44px', height: '28px', padding: 0, border: 'none', background: 'none' }}
              />
              <button
                type="button"
                onClick={() => updateUIAppearance({ welcomePanelColor: '#ffffff' })}
                style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontSize: '0.72rem' }}
              >
                Reset
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem' }}>Welcome Frame / Border</span>
            <select
              value={welcomePanelFrameMode}
              onChange={(e) => updateUIAppearance({ welcomePanelFrameMode: e.target.value as typeof welcomePanelFrameMode })}
              style={{ padding: '5px', fontSize: '0.8rem' }}
            >
              <option value="accent">Use accent color</option>
              <option value="custom">Custom color</option>
              <option value="none">No frame / transparent</option>
            </select>
            {welcomePanelFrameMode === 'custom' && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="color"
                  value={welcomePanelFrameColor || '#d7e0e7'}
                  onChange={(e) => updateUIAppearance({ welcomePanelFrameColor: e.target.value, welcomePanelFrameMode: 'custom' })}
                  style={{ width: '44px', height: '28px', padding: 0, border: 'none', background: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => updateUIAppearance({ welcomePanelFrameColor: '#d7e0e7', welcomePanelFrameMode: 'custom' })}
                  style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontSize: '0.72rem' }}
                >
                  Reset
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Welcome Sidebar Container</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.8rem' }}>Container Background</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="color"
                  value={welcomeSidebarContainerColor || '#fdf6e3'}
                  onChange={(e) => updateUIAppearance({ welcomeSidebarContainerColor: e.target.value })}
                  style={{ width: '44px', height: '28px', padding: 0, border: 'none', background: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => updateUIAppearance({ welcomeSidebarContainerColor: 'transparent' })}
                  style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontSize: '0.72rem' }}
                >
                  None
                </button>
                <button
                  type="button"
                  onClick={() => updateUIAppearance({ welcomeSidebarContainerColor: '#fdf6e3' })}
                  style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontSize: '0.72rem' }}
                >
                  Reset
                </button>
              </div>
            </div>
            <select
              value={welcomeSidebarContainerFrameMode}
              onChange={(e) => updateUIAppearance({ welcomeSidebarContainerFrameMode: e.target.value as typeof welcomeSidebarContainerFrameMode })}
              style={{ padding: '5px', fontSize: '0.8rem' }}
            >
              <option value="accent">Use accent color for container frame</option>
              <option value="custom">Custom container frame color</option>
              <option value="none">No container frame / transparent</option>
            </select>
            {welcomeSidebarContainerFrameMode === 'custom' && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="color"
                  value={welcomeSidebarContainerFrameColor || '#eee8d5'}
                  onChange={(e) => updateUIAppearance({ welcomeSidebarContainerFrameColor: e.target.value, welcomeSidebarContainerFrameMode: 'custom' })}
                  style={{ width: '44px', height: '28px', padding: 0, border: 'none', background: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => updateUIAppearance({ welcomeSidebarContainerFrameColor: '#eee8d5', welcomeSidebarContainerFrameMode: 'custom' })}
                  style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontSize: '0.72rem' }}
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <p style={{ fontSize: '0.7rem', color: '#666', marginTop: '10px' }}>
        Adjust platform menus and panel presentation without changing board visuals.
      </p>
    </div>
  );
};

export default PlatformAppearanceView;
