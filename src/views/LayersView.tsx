import React, { useEffect, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { type LayerConfig, type Template } from '../templates';

interface ImageInputProps {
  label: string;
  imageValue: string;
  onImageChange: (dataUrl: string) => void;
  onClear: () => void;
  inputId: string;
  maxSize?: number;
  isGlass?: boolean;
}

const ImageInput: React.FC<ImageInputProps> = ({
  label,
  imageValue,
  onImageChange,
  onClear,
  inputId,
  maxSize = 3 * 1024 * 1024,
  isGlass = false
}) => {
  const [status, setStatus] = useState<{ name: string; loading: boolean }>({ name: '', loading: false });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') || file.size > maxSize) {
      const mb = Math.round(maxSize / (1024 * 1024));
      alert(`Invalid file: Must be an image < ${mb}MB.`);
      return;
    }
    setStatus({ name: file.name, loading: true });
    const reader = new FileReader();
    reader.onload = (event) => {
      onImageChange(event.target?.result as string);
      setStatus({ name: file.name, loading: false });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const buttonStyle: React.CSSProperties = {
    fontSize: '0.65rem',
    padding: '1px 5px',
    cursor: 'pointer',
    borderRadius: '4px',
    border: isGlass ? '1px solid rgba(56, 189, 248, 0.35)' : undefined,
    background: isGlass ? 'rgba(8, 17, 34, 0.85)' : undefined,
    color: isGlass ? '#e6f4ff' : undefined,
    boxShadow: isGlass ? 'inset 0 0 0 1px rgba(255,255,255,0.03)' : undefined
  };

  return (
    <div className="image-input-container" style={{ marginTop: '5px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isGlass ? '#dbeafe' : undefined }}>{label}</span>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button onClick={() => document.getElementById(inputId)?.click()} style={buttonStyle}>Select</button>
          <button onClick={() => { onClear(); setStatus({ name: '', loading: false }); }} style={{ ...buttonStyle, color: isGlass ? '#fda4af' : '#f44336' }}>Clear</button>
        </div>
        <input id={inputId} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      </div>

      {status.loading && <div style={{ fontSize: '0.65rem', color: isGlass ? '#38bdf8' : '#2196f3' }}>Loading...</div>}
      {imageValue && (
        <div
          style={{
            margin: '8px 0',
            border: isGlass ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid #ddd',
            borderRadius: '4px',
            overflow: 'hidden',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isGlass ? 'rgba(9, 18, 34, 0.88)' : '#eee',
            boxShadow: isGlass ? 'inset 0 0 0 1px rgba(255,255,255,0.02)' : undefined
          }}
        >
          <img src={imageValue} alt="Preview" style={{ height: '100%', width: 'auto', maxWidth: '100%', objectFit: 'contain' }} />
        </div>
      )}
    </div>
  );
};

interface LayerEditorProps {
  label: string;
  config: LayerConfig;
  onUpdate: (updates: Partial<LayerConfig>) => void;
  inputId: string;
  showColor?: boolean;
  maxSize?: number;
  showLockToBoard?: boolean;
  isGlass?: boolean;
}

const LayerEditor: React.FC<LayerEditorProps> = ({
  label,
  config,
  onUpdate,
  inputId,
  showColor = true,
  maxSize,
  showLockToBoard = false,
  isGlass = false
}) => {
  const displayColor = config.color === 'transparent' ? '#ffffff' : config.color;
  const cardBg = isGlass ? 'rgba(10, 20, 38, 0.88)' : '#fafafa';
  const cardBorder = isGlass ? '1px solid rgba(56, 189, 248, 0.24)' : '1px solid #eee';
  const subCardBg = isGlass ? 'rgba(6, 14, 28, 0.92)' : 'white';
  const subCardBorder = isGlass ? '1px solid rgba(56, 189, 248, 0.2)' : '1px solid #eee';
  const controlText = isGlass ? '#dbeafe' : undefined;
  const mutedText = isGlass ? '#94a3b8' : '#888';

  const controlSurfaceStyle: React.CSSProperties = {
    width: '100%',
    fontSize: '0.7rem',
    padding: '2px',
    background: isGlass ? 'rgba(8, 17, 34, 0.9)' : undefined,
    color: isGlass ? '#e2e8f0' : undefined,
    border: isGlass ? '1px solid rgba(56, 189, 248, 0.25)' : undefined,
    borderRadius: isGlass ? '4px' : undefined
  };

  const smallInputStyle: React.CSSProperties = {
    fontSize: '0.7rem',
    padding: '1px',
    border: isGlass ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid #ddd',
    borderRadius: '2px',
    background: isGlass ? 'rgba(8, 17, 34, 0.9)' : '#fff',
    color: isGlass ? '#e2e8f0' : undefined
  };

  const buttonStyle: React.CSSProperties = {
    fontSize: '0.6rem',
    padding: '1px 4px',
    cursor: 'pointer',
    borderRadius: '4px',
    border: isGlass ? '1px solid rgba(56, 189, 248, 0.3)' : undefined,
    background: isGlass ? 'rgba(8, 17, 34, 0.9)' : undefined,
    color: isGlass ? '#dbeafe' : undefined,
    opacity: 0.9
  };

  return (
    <div style={{ marginTop: '12px', padding: '8px', border: cardBorder, borderRadius: '6px', background: cardBg }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h5 style={{ margin: 0, fontSize: '0.85rem', color: controlText }}>{label}</h5>
        <button onClick={() => onUpdate({ xOffset: 0, yOffset: 0, scale: 100 })} style={buttonStyle}>Reset</button>
      </div>

      <ImageInput label="Texture" imageValue={config.image} inputId={inputId} onImageChange={(img) => onUpdate({ image: img })} onClear={() => onUpdate({ image: '' })} maxSize={maxSize} isGlass={isGlass} />

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '8px' }}>
        {showColor && (
          <div className="setting-item" style={{ flex: 1 }}>
            <span style={{ fontSize: '0.75rem', color: controlText }}>Color</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input type="color" value={displayColor} onChange={(e) => onUpdate({ color: e.target.value })} style={{ width: '24px', height: '24px', padding: 0, background: 'transparent' }} />
              <button onClick={() => onUpdate({ color: 'transparent' })} style={buttonStyle}>None</button>
            </div>
          </div>
        )}
        <div className="setting-item" style={{ flex: showColor ? 2 : 1 }}>
          <span style={{ fontSize: '0.75rem', color: controlText }}>Alpha</span>
          <input type="range" min="0" max="1" step="0.1" value={config.opacity} onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })} style={{ flex: 1, width: '100%' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', background: subCardBg, padding: '4px 6px', borderRadius: '4px', border: subCardBorder, width: 'fit-content', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <span style={{ fontSize: '0.55rem', color: mutedText, fontWeight: 'bold' }}>X</span>
          <input type="number" value={config.xOffset || 0} onChange={(e) => onUpdate({ xOffset: parseInt(e.target.value) || 0 })} style={{ ...smallInputStyle, width: '32px' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <span style={{ fontSize: '0.55rem', color: mutedText, fontWeight: 'bold' }}>Y</span>
          <input type="number" value={config.yOffset || 0} onChange={(e) => onUpdate({ yOffset: parseInt(e.target.value) || 0 })} style={{ ...smallInputStyle, width: '32px' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <span style={{ fontSize: '0.55rem', color: mutedText, fontWeight: 'bold' }}>Scale</span>
          <input type="number" value={config.scale || 100} onChange={(e) => onUpdate({ scale: parseInt(e.target.value) || 100 })} style={{ ...smallInputStyle, width: '36px' }} />
          <span style={{ fontSize: '0.6rem', color: mutedText }}>%</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginTop: '8px' }}>
        <select value={config.repeat} onChange={(e) => onUpdate({ repeat: e.target.value as any })} style={controlSurfaceStyle}>
          <option value="no-repeat">No Repeat</option>
          <option value="centered">Centered</option>
          <option value="repeat">Repeat</option>
          <option value="space">Space</option>
          <option value="round">Round</option>
        </select>
        <select value={config.size} onChange={(e) => onUpdate({ size: e.target.value })} style={controlSurfaceStyle}>
          <option value="cover">Mode: Cover</option>
          <option value="contain">Mode: Contain</option>
          <option value="auto">Mode: Auto</option>
          <option value="50%">Mode: 50%</option>
          <option value="10%">Mode: 10%</option>
        </select>
      </div>

      {showLockToBoard && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px', fontSize: '0.72rem', color: isGlass ? '#cbd5e1' : '#334155' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            Frame size mode
            <select
              value={config.frameSizeMode ?? (config.lockToBoard ? 'match-board' : 'responsive')}
              onChange={(e) => onUpdate({ frameSizeMode: e.target.value as LayerConfig['frameSizeMode'], lockToBoard: e.target.value === 'match-board' })}
              style={{ ...controlSurfaceStyle, padding: '4px', fontSize: '0.72rem' }}
            >
              <option value="responsive">Responsive to center panel</option>
              <option value="match-board">Match board / lock to board</option>
              <option value="fixed">Fixed size</option>
            </select>
          </label>
          {(config.frameSizeMode ?? (config.lockToBoard ? 'match-board' : 'responsive')) === 'fixed' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <label>
                Width
                <input type="number" min="100" value={config.fixedWidth || 560} onChange={(e) => onUpdate({ fixedWidth: parseInt(e.target.value, 10) || 560 })} style={{ ...controlSurfaceStyle, boxSizing: 'border-box' }} />
              </label>
              <label>
                Height
                <input type="number" min="100" value={config.fixedHeight || 560} onChange={(e) => onUpdate({ fixedHeight: parseInt(e.target.value, 10) || 560 })} style={{ ...controlSurfaceStyle, boxSizing: 'border-box' }} />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const LayersView: React.FC = () => {
  const { settings, updateTemplate, updateThemeDraft } = useSettings();
  const activeTemplate = settings.themeDraft ?? settings.template;
  const [draft, setDraft] = useState<Template>(JSON.parse(JSON.stringify(activeTemplate)));
  const [lastCommitted, setLastCommitted] = useState<Template>(JSON.parse(JSON.stringify(activeTemplate)));
  const { background, frameLayer, boardOverlay } = draft;
  const hasUnappliedChanges = JSON.stringify(draft) !== JSON.stringify(lastCommitted);
  const BACKGROUND_MAX_SIZE = 20 * 1024 * 1024;
  const isGlass = settings.uiAppearance.sidebarStyle === 'glass';

  useEffect(() => {
    if (settings.themeDraft) updateThemeDraft({
      boardOverlay: draft.boardOverlay,
      background: draft.background,
      frameLayer: draft.frameLayer
    });
    else updateTemplate({
      boardOverlay: draft.boardOverlay,
      background: draft.background,
      frameLayer: draft.frameLayer
    });
  }, [draft]);

  const updateLayer = (key: keyof Template, updates: any) => {
    setDraft(prev => {
      const next = { ...prev, [key]: { ...(prev as any)[key], ...updates } };
      return next;
    });
  };

  const applyLayerChanges = () => {
    if (settings.themeDraft) updateThemeDraft({
      boardOverlay: draft.boardOverlay,
      background: draft.background,
      frameLayer: draft.frameLayer
    });
    else updateTemplate({
      boardOverlay: draft.boardOverlay,
      background: draft.background,
      frameLayer: draft.frameLayer
    });
    setLastCommitted(JSON.parse(JSON.stringify(draft)));
  };

  const discardLayerChanges = () => {
    const restored = JSON.parse(JSON.stringify(lastCommitted));
    setDraft(restored);
    if (settings.themeDraft) updateThemeDraft({
      boardOverlay: restored.boardOverlay,
      background: restored.background,
      frameLayer: restored.frameLayer
    });
    else updateTemplate({
      boardOverlay: restored.boardOverlay,
      background: restored.background,
      frameLayer: restored.frameLayer
    });
  };

  const primaryButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: '8px',
    background: hasUnappliedChanges ? (isGlass ? 'linear-gradient(180deg, rgba(14, 165, 233, 0.28), rgba(8, 47, 73, 0.92))' : '#27ae60') : '#ccc',
    color: 'white',
    border: isGlass ? '1px solid rgba(56, 189, 248, 0.35)' : 'none',
    borderRadius: '4px',
    cursor: hasUnappliedChanges ? 'pointer' : 'not-allowed',
    fontWeight: 700,
    boxShadow: isGlass ? 'inset 0 0 0 1px rgba(255,255,255,0.03)' : undefined
  };

  const secondaryButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: '8px',
    background: isGlass ? 'rgba(8, 17, 34, 0.88)' : '#f8f9fa',
    color: isGlass ? '#e2e8f0' : undefined,
    border: isGlass ? '1px solid rgba(56, 189, 248, 0.22)' : '1px solid #ddd',
    borderRadius: '4px',
    cursor: hasUnappliedChanges ? 'pointer' : 'not-allowed'
  };

  const sectionStyle: React.CSSProperties = {
    marginTop: '12px',
    padding: '8px',
    border: isGlass ? '1px solid rgba(56, 189, 248, 0.24)' : '1px solid #eee',
    borderRadius: '6px',
    background: isGlass ? 'rgba(10, 20, 38, 0.88)' : '#fafafa'
  };

  return (
    <div className="view-container">
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
        <button onClick={applyLayerChanges} disabled={!hasUnappliedChanges} style={primaryButtonStyle}>
          Apply Layers
        </button>
        <button onClick={discardLayerChanges} disabled={!hasUnappliedChanges} style={secondaryButtonStyle}>
          Discard
        </button>
      </div>
      {hasUnappliedChanges && (
        <div style={{ marginBottom: '10px', fontSize: '0.7rem', color: isGlass ? '#fbbf24' : '#8a5a00' }}>
          Layer changes are previewing on the board. Press Apply Layers to keep them.
        </div>
      )}
      <section style={sectionStyle}>
        <h4 style={{ fontSize: '0.85rem', color: isGlass ? '#e2e8f0' : undefined }}>Board Overlay</h4>
        <div className="setting-item" style={{ gap: '10px' }}>
          <input type="range" min="0" max="1" step="0.1" value={boardOverlay.opacity} onChange={(e) => updateLayer('boardOverlay', { opacity: parseFloat(e.target.value) })} style={{ flex: 1 }} />
          <span style={{ fontSize: '0.75rem', color: isGlass ? '#dbeafe' : undefined }}>Opacity</span>
        </div>
        <ImageInput label="Texture" imageValue={boardOverlay.image} inputId="overlay-img" onImageChange={(img) => updateLayer('boardOverlay', { image: img })} onClear={() => updateLayer('boardOverlay', { image: '' })} maxSize={BACKGROUND_MAX_SIZE} isGlass={isGlass} />
        <div className="setting-item" style={{ gap: '10px', marginTop: '6px' }}>
          <label style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!boardOverlay.colorEnabled}
              onChange={(e) => updateLayer('boardOverlay', { colorEnabled: e.target.checked })}
            />
            Color Layer
          </label>
        </div>
        {boardOverlay.colorEnabled && (
          <>
            <div className="setting-item">
              <span style={{ fontSize: '0.75rem', color: isGlass ? '#dbeafe' : undefined }}>Color</span>
              <input type="color" value={boardOverlay.color || '#4169e1'} onChange={(e) => updateLayer('boardOverlay', { color: e.target.value })} style={{ width: '44px', height: '26px', padding: 0, border: 'none', background: 'none' }} />
            </div>
            <div className="setting-item" style={{ gap: '10px' }}>
              <input type="range" min="0" max="1" step="0.05" value={boardOverlay.colorOpacity ?? 0.25} onChange={(e) => updateLayer('boardOverlay', { colorOpacity: parseFloat(e.target.value) })} style={{ flex: 1 }} />
              <span style={{ fontSize: '0.75rem', color: isGlass ? '#dbeafe' : undefined }}>Color Opacity</span>
            </div>
          </>
        )}
      </section>

      <LayerEditor label="Frame Layer" config={frameLayer} onUpdate={(u) => updateLayer('frameLayer', u)} inputId="frame-img" showColor={false} maxSize={BACKGROUND_MAX_SIZE} showLockToBoard isGlass={isGlass} />
      <LayerEditor label="Background" config={background} onUpdate={(u) => updateLayer('background', u)} inputId="bg-img" showColor={true} maxSize={BACKGROUND_MAX_SIZE} isGlass={isGlass} />
    </div>
  );
};

export default LayersView;
