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
}

const ImageInput: React.FC<ImageInputProps> = ({ label, imageValue, onImageChange, onClear, inputId, maxSize = 3 * 1024 * 1024 }) => {
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

  return (
    <div className="image-input-container" style={{ marginTop: '5px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{label}</span>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button onClick={() => document.getElementById(inputId)?.click()} style={{ fontSize: '0.65rem', padding: '1px 5px', cursor: 'pointer' }}>Select</button>
          <button onClick={() => { onClear(); setStatus({ name: '', loading: false }); }} style={{ fontSize: '0.65rem', padding: '1px 5px', cursor: 'pointer', color: '#f44336' }}>Clear</button>
        </div>
        <input id={inputId} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      </div>

      {status.loading && <div style={{ fontSize: '0.65rem', color: '#2196f3' }}>Loading...</div>}
      {imageValue && (
        <div style={{ margin: '8px 0', border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eee' }}>
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
}

const LayerEditor: React.FC<LayerEditorProps> = ({
  label,
  config,
  onUpdate,
  inputId,
  showColor = true,
  maxSize,
  showLockToBoard = false
}) => {
  const displayColor = config.color === 'transparent' ? '#ffffff' : config.color;

  return (
    <div style={{ marginTop: '12px', padding: '8px', border: '1px solid #eee', borderRadius: '6px', background: '#fafafa' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h5 style={{ margin: 0, fontSize: '0.85rem' }}>{label}</h5>
        <button onClick={() => onUpdate({ xOffset: 0, yOffset: 0, scale: 100 })} style={{ fontSize: '0.6rem', padding: '1px 4px', cursor: 'pointer', opacity: 0.7 }}>Reset</button>
      </div>

      <ImageInput label="Texture" imageValue={config.image} inputId={inputId} onImageChange={(img) => onUpdate({ image: img })} onClear={() => onUpdate({ image: '' })} maxSize={maxSize} />

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '8px' }}>
        {showColor && (
          <div className="setting-item" style={{ flex: 1 }}>
            <span style={{ fontSize: '0.75rem' }}>Color</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input type="color" value={displayColor} onChange={(e) => onUpdate({ color: e.target.value })} style={{ width: '24px', height: '24px', padding: 0 }} />
              <button onClick={() => onUpdate({ color: 'transparent' })} style={{ fontSize: '0.6rem', padding: '1px 4px', cursor: 'pointer' }}>None</button>
            </div>
          </div>
        )}
        <div className="setting-item" style={{ flex: showColor ? 2 : 1 }}>
          <span style={{ fontSize: '0.75rem' }}>Alpha</span>
          <input type="range" min="0" max="1" step="0.1" value={config.opacity} onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })} style={{ flex: 1, width: '100%' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', background: 'white', padding: '4px 6px', borderRadius: '4px', border: '1px solid #eee', width: 'fit-content', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <span style={{ fontSize: '0.55rem', color: '#888', fontWeight: 'bold' }}>X</span>
          <input type="number" value={config.xOffset || 0} onChange={(e) => onUpdate({ xOffset: parseInt(e.target.value) || 0 })} style={{ width: '32px', fontSize: '0.7rem', padding: '1px', border: '1px solid #ddd', borderRadius: '2px' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <span style={{ fontSize: '0.55rem', color: '#888', fontWeight: 'bold' }}>Y</span>
          <input type="number" value={config.yOffset || 0} onChange={(e) => onUpdate({ yOffset: parseInt(e.target.value) || 0 })} style={{ width: '32px', fontSize: '0.7rem', padding: '1px', border: '1px solid #ddd', borderRadius: '2px' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <span style={{ fontSize: '0.55rem', color: '#888', fontWeight: 'bold' }}>Scale</span>
          <input type="number" value={config.scale || 100} onChange={(e) => onUpdate({ scale: parseInt(e.target.value) || 100 })} style={{ width: '36px', fontSize: '0.7rem', padding: '1px', border: '1px solid #ddd', borderRadius: '2px' }} />
          <span style={{ fontSize: '0.6rem', color: '#888' }}>%</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginTop: '8px' }}>
        <select value={config.repeat} onChange={(e) => onUpdate({ repeat: e.target.value as any })} style={{ width: '100%', fontSize: '0.7rem', padding: '2px' }}>
          <option value="no-repeat">No Repeat</option>
          <option value="centered">Centered</option>
          <option value="repeat">Repeat</option>
          <option value="space">Space</option>
          <option value="round">Round</option>
        </select>
        <select value={config.size} onChange={(e) => onUpdate({ size: e.target.value })} style={{ width: '100%', fontSize: '0.7rem', padding: '2px' }}>
          <option value="cover">Mode: Cover</option>
          <option value="contain">Mode: Contain</option>
          <option value="auto">Mode: Auto</option>
          <option value="50%">Mode: 50%</option>
          <option value="10%">Mode: 10%</option>
        </select>
      </div>

      {showLockToBoard && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px', fontSize: '0.72rem', color: '#334155' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            Frame size mode
            <select
              value={config.frameSizeMode ?? (config.lockToBoard ? 'match-board' : 'responsive')}
              onChange={(e) => onUpdate({ frameSizeMode: e.target.value as LayerConfig['frameSizeMode'], lockToBoard: e.target.value === 'match-board' })}
              style={{ padding: '4px', fontSize: '0.72rem' }}
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
                <input type="number" min="100" value={config.fixedWidth || 560} onChange={(e) => onUpdate({ fixedWidth: parseInt(e.target.value, 10) || 560 })} style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.7rem' }} />
              </label>
              <label>
                Height
                <input type="number" min="100" value={config.fixedHeight || 560} onChange={(e) => onUpdate({ fixedHeight: parseInt(e.target.value, 10) || 560 })} style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.7rem' }} />
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

  return (
    <div className="view-container">
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
        <button
          onClick={applyLayerChanges}
          disabled={!hasUnappliedChanges}
          style={{ flex: 1, padding: '8px', background: hasUnappliedChanges ? '#27ae60' : '#ccc', color: 'white', border: 'none', borderRadius: '4px', cursor: hasUnappliedChanges ? 'pointer' : 'not-allowed', fontWeight: 700 }}
        >
          Apply Layers
        </button>
        <button
          onClick={discardLayerChanges}
          disabled={!hasUnappliedChanges}
          style={{ flex: 1, padding: '8px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', cursor: hasUnappliedChanges ? 'pointer' : 'not-allowed' }}
        >
          Discard
        </button>
      </div>
      {hasUnappliedChanges && (
        <div style={{ marginBottom: '10px', fontSize: '0.7rem', color: '#8a5a00' }}>
          Layer changes are previewing on the board. Press Apply Layers to keep them.
        </div>
      )}
      <section>
        <h4 style={{ fontSize: '0.85rem' }}>Board Overlay</h4>
        <div className="setting-item" style={{ gap: '10px' }}>
          <input type="range" min="0" max="1" step="0.1" value={boardOverlay.opacity} onChange={(e) => updateLayer('boardOverlay', { opacity: parseFloat(e.target.value) })} style={{ flex: 1 }} />
          <span style={{ fontSize: '0.75rem' }}>Opacity</span>
        </div>
        <ImageInput label="Texture" imageValue={boardOverlay.image} inputId="overlay-img" onImageChange={(img) => updateLayer('boardOverlay', { image: img })} onClear={() => updateLayer('boardOverlay', { image: '' })} maxSize={BACKGROUND_MAX_SIZE} />
      </section>

      <LayerEditor label="Frame Layer" config={frameLayer} onUpdate={(u) => updateLayer('frameLayer', u)} inputId="frame-img" showColor={false} maxSize={BACKGROUND_MAX_SIZE} showLockToBoard />
      <LayerEditor label="Background" config={background} onUpdate={(u) => updateLayer('background', u)} inputId="bg-img" showColor={true} maxSize={BACKGROUND_MAX_SIZE} />
    </div>
  );
};

export default LayersView;
