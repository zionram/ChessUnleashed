import React, { useEffect, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { type LayerConfig, type Template } from '../templates';

const BACKGROUND_MAX_SIZE = 20 * 1024 * 1024;

const REPEAT_OPTIONS = [
  ['no-repeat', 'No Repeat'],
  ['centered', 'Centered'],
  ['repeat', 'Repeat'],
  ['space', 'Space'],
  ['round', 'Round']
] as const;

const LAYER_SIZE_OPTIONS = [
  ['cover', 'Mode: Cover'],
  ['contain', 'Mode: Contain'],
  ['auto', 'Mode: Auto'],
  ['50%', 'Mode: 50%'],
  ['10%', 'Mode: 10%']
] as const;

const ANCHOR_OPTIONS = [
  ['center', 'Center'],
  ['top-left', 'Top Left'],
  ['top', 'Top'],
  ['top-right', 'Top Right'],
  ['left', 'Left'],
  ['right', 'Right'],
  ['bottom-left', 'Bottom Left'],
  ['bottom', 'Bottom'],
  ['bottom-right', 'Bottom Right']
] as const;

const OVERLAY_SIZE_OPTIONS = [
  ['cover', 'Cover board'],
  ['contain', 'Contain in board'],
  ['100% 100%', 'Stretch to board'],
  ['auto', 'Original size']
] as const;

const BLEND_MODE_OPTIONS = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'soft-light',
  'hard-light',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'difference',
  'luminosity'
] as const;

const FRAME_SIZE_OPTIONS: Array<[NonNullable<LayerConfig['frameSizeMode']>, string]> = [
  ['responsive', 'Responsive to center panel'],
  ['match-board', 'Match board / lock to board'],
  ['fixed', 'Fixed size']
];

const hiddenInputStyle: React.CSSProperties = { display: 'none' };
const colorInputStyle: React.CSSProperties = { width: '44px', height: '26px', padding: 0, border: 'none', background: 'none' };
const smallColorInputStyle: React.CSSProperties = { width: '24px', height: '24px', padding: 0, background: 'transparent' };
const fullRangeStyle: React.CSSProperties = { flex: 1, width: '100%' };

interface ImageInputProps {
  label: string;
  imageValue: string;
  onImageChange: (dataUrl: string) => void;
  onClear: () => void;
  inputId: string;
  maxSize?: number;
}

const ImageInput: React.FC<ImageInputProps> = ({
  label,
  imageValue,
  onImageChange,
  onClear,
  inputId,
  maxSize = 3 * 1024 * 1024
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

  const clearImage = () => {
    onClear();
    setStatus({ name: '', loading: false });
  };

  return (
    <div className="cu-image-input">
      <div className="cu-control-row cu-image-input-header">
        <span className="cu-layer-field-label">{label}</span>
        <div className="cu-control-row cu-image-input-actions">
          <label className="cu-inline-button cu-layer-button" htmlFor={inputId}>Select</label>
          <button className="cu-inline-button cu-layer-button cu-layer-danger-action" onClick={clearImage}>Clear</button>
        </div>
        <input id={inputId} type="file" accept="image/*" onChange={handleFile} style={hiddenInputStyle} />
      </div>

      {status.loading && <div className="cu-layer-status">Loading...</div>}
      {imageValue && (
        <div className="cu-image-preview">
          <img src={imageValue} alt="Preview" />
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
  const frameSizeMode = config.frameSizeMode ?? (config.lockToBoard ? 'match-board' : 'responsive');

  return (
    <section className="cu-panel-card cu-layer-editor-card">
      <div className="cu-control-row cu-layer-editor-header">
        <h5>{label}</h5>
        <button className="cu-inline-button cu-layer-button" onClick={() => onUpdate({ xOffset: 0, yOffset: 0, scale: 100 })}>Reset</button>
      </div>

      <ImageInput label="Texture" imageValue={config.image} inputId={inputId} onImageChange={(img) => onUpdate({ image: img })} onClear={() => onUpdate({ image: '' })} maxSize={maxSize} />

      <div className="cu-layer-control-grid" data-has-color={showColor ? 'true' : 'false'}>
        {showColor && (
          <div className="setting-item cu-compact-setting-item">
            <span className="cu-layer-field-label">Color</span>
            <div className="cu-control-row cu-layer-color-row">
              <input type="color" value={displayColor} onChange={(e) => onUpdate({ color: e.target.value })} style={smallColorInputStyle} />
              <button className="cu-inline-button cu-layer-button" onClick={() => onUpdate({ color: 'transparent' })}>None</button>
            </div>
          </div>
        )}
        <div className="setting-item cu-compact-setting-item">
          <span className="cu-layer-field-label">Alpha</span>
          <input type="range" min="0" max="1" step="0.1" value={config.opacity} onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })} style={fullRangeStyle} />
        </div>
      </div>

      <div className="cu-panel-card-muted cu-layer-offset-row">
        <label className="cu-layer-offset-control">
          <span>X</span>
          <input type="number" value={config.xOffset || 0} onChange={(e) => onUpdate({ xOffset: parseInt(e.target.value, 10) || 0 })} />
        </label>
        <label className="cu-layer-offset-control">
          <span>Y</span>
          <input type="number" value={config.yOffset || 0} onChange={(e) => onUpdate({ yOffset: parseInt(e.target.value, 10) || 0 })} />
        </label>
        <label className="cu-layer-offset-control">
          <span>Scale</span>
          <input type="number" value={config.scale || 100} onChange={(e) => onUpdate({ scale: parseInt(e.target.value, 10) || 100 })} />
          <span>%</span>
        </label>
      </div>

      <div className="cu-control-grid cu-layer-select-grid">
        <select value={config.repeat} onChange={(e) => onUpdate({ repeat: e.target.value as LayerConfig['repeat'] })}>
          {REPEAT_OPTIONS.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
        </select>
        <select value={config.size} onChange={(e) => onUpdate({ size: e.target.value })}>
          {LAYER_SIZE_OPTIONS.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
        </select>
      </div>

      {showLockToBoard && (
        <div className="cu-layer-field-stack">
          <label className="cu-layer-field">
            Frame size mode
            <select
              value={frameSizeMode}
              onChange={(e) => onUpdate({ frameSizeMode: e.target.value as LayerConfig['frameSizeMode'], lockToBoard: e.target.value === 'match-board' })}
            >
              {FRAME_SIZE_OPTIONS.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
            </select>
          </label>
          {frameSizeMode === 'fixed' && (
            <div className="cu-control-grid cu-layer-select-grid">
              <label className="cu-layer-field">
                Width
                <input type="number" min="100" value={config.fixedWidth || 560} onChange={(e) => onUpdate({ fixedWidth: parseInt(e.target.value, 10) || 560 })} />
              </label>
              <label className="cu-layer-field">
                Height
                <input type="number" min="100" value={config.fixedHeight || 560} onChange={(e) => onUpdate({ fixedHeight: parseInt(e.target.value, 10) || 560 })} />
              </label>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

const LayersView: React.FC = () => {
  const { settings, updateTemplate, updateThemeDraft } = useSettings();
  const activeTemplate = settings.themeDraft ?? settings.template;
  const [draft, setDraft] = useState<Template>(JSON.parse(JSON.stringify(activeTemplate)));
  const [lastCommitted, setLastCommitted] = useState<Template>(JSON.parse(JSON.stringify(activeTemplate)));
  const { frameLayer, boardOverlay } = draft;
  const hasUnappliedChanges = JSON.stringify(draft) !== JSON.stringify(lastCommitted);

  useEffect(() => {
    if (settings.themeDraft) updateThemeDraft({
      boardOverlay: draft.boardOverlay,
      frameLayer: draft.frameLayer
    });
    else updateTemplate({
      boardOverlay: draft.boardOverlay,
      frameLayer: draft.frameLayer
    });
  }, [draft]);

  const updateLayer = (key: keyof Template, updates: any) => {
    setDraft(prev => ({ ...prev, [key]: { ...(prev as any)[key], ...updates } }));
  };

  const applyLayerChanges = () => {
    if (settings.themeDraft) updateThemeDraft({
      boardOverlay: draft.boardOverlay,
      frameLayer: draft.frameLayer
    });
    else updateTemplate({
      boardOverlay: draft.boardOverlay,
      frameLayer: draft.frameLayer
    });
    setLastCommitted(JSON.parse(JSON.stringify(draft)));
  };

  const discardLayerChanges = () => {
    const restored = JSON.parse(JSON.stringify(lastCommitted));
    setDraft(restored);
    if (settings.themeDraft) updateThemeDraft({
      boardOverlay: restored.boardOverlay,
      frameLayer: restored.frameLayer
    });
    else updateTemplate({
      boardOverlay: restored.boardOverlay,
      frameLayer: restored.frameLayer
    });
  };

  return (
    <div className="view-container cu-layers-view">
      <div className="cu-control-row cu-layer-action-row">
        <button className="cu-inline-button cu-layer-primary-action" onClick={applyLayerChanges} disabled={!hasUnappliedChanges}>
          Apply Layers
        </button>
        <button className="cu-inline-button cu-layer-secondary-action" onClick={discardLayerChanges} disabled={!hasUnappliedChanges}>
          Discard
        </button>
      </div>

      {hasUnappliedChanges && (
        <div className="cu-layer-notice">
          Layer changes are previewing on the board. Press Apply Layers to keep them.
        </div>
      )}

      <section className="cu-panel-card cu-layer-editor-card">
        <h4>Board Overlay</h4>
        <div className="setting-item cu-layer-setting-row">
          <input type="range" min="0" max="1" step="0.1" value={boardOverlay.opacity} onChange={(e) => updateLayer('boardOverlay', { opacity: parseFloat(e.target.value) })} style={fullRangeStyle} />
          <span className="cu-layer-field-label">Opacity</span>
        </div>

        <ImageInput label="Texture" imageValue={boardOverlay.image} inputId="overlay-img" onImageChange={(img) => updateLayer('boardOverlay', { image: img })} onClear={() => updateLayer('boardOverlay', { image: '' })} maxSize={BACKGROUND_MAX_SIZE} />

        <div className="cu-control-grid cu-layer-select-grid">
          <label className="cu-layer-field">
            Snap image to
            <select
              value={(boardOverlay as any).anchor || 'center'}
              onChange={(e) => updateLayer('boardOverlay', { anchor: e.target.value, repeat: 'no-repeat' })}
            >
              {ANCHOR_OPTIONS.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
            </select>
          </label>
          <label className="cu-layer-field">
            Image fit
            <select
              value={(boardOverlay as any).size || 'cover'}
              onChange={(e) => updateLayer('boardOverlay', { size: e.target.value, repeat: 'no-repeat', scale: 100 })}
            >
              {OVERLAY_SIZE_OPTIONS.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
            </select>
          </label>
        </div>

        <label className="cu-layer-field cu-layer-field-full">
          Blend mode
          <select
            value={(boardOverlay as any).blendMode || 'normal'}
            onChange={(e) => updateLayer('boardOverlay', { blendMode: e.target.value })}
          >
            {BLEND_MODE_OPTIONS.map(value => <option key={value} value={value}>{value.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
          </select>
        </label>

        <div className="cu-control-grid cu-layer-select-grid cu-layer-three-grid">
          <label className="cu-layer-field">
            X offset
            <input type="number" value={(boardOverlay as any).xOffset || 0} onChange={(e) => updateLayer('boardOverlay', { xOffset: parseInt(e.target.value, 10) || 0 })} />
          </label>
          <label className="cu-layer-field">
            Y offset
            <input type="number" value={(boardOverlay as any).yOffset || 0} onChange={(e) => updateLayer('boardOverlay', { yOffset: parseInt(e.target.value, 10) || 0 })} />
          </label>
          <label className="cu-layer-field">
            Scale %
            <input type="number" min="1" value={(boardOverlay as any).scale || 100} onChange={(e) => updateLayer('boardOverlay', { scale: parseInt(e.target.value, 10) || 100 })} />
          </label>
        </div>

        <div className="setting-item cu-layer-setting-row">
          <label className="cu-control-row cu-layer-checkbox-label">
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
            <div className="setting-item cu-layer-setting-row">
              <span className="cu-layer-field-label">Color</span>
              <input type="color" value={boardOverlay.color || '#4169e1'} onChange={(e) => updateLayer('boardOverlay', { color: e.target.value })} style={colorInputStyle} />
            </div>
            <div className="setting-item cu-layer-setting-row">
              <input type="range" min="0" max="1" step="0.05" value={boardOverlay.colorOpacity ?? 0.25} onChange={(e) => updateLayer('boardOverlay', { colorOpacity: parseFloat(e.target.value) })} style={fullRangeStyle} />
              <span className="cu-layer-field-label">Color Opacity</span>
            </div>
          </>
        )}
      </section>

      <LayerEditor label="Frame Layer" config={frameLayer} onUpdate={(u) => updateLayer('frameLayer', u)} inputId="frame-img" showColor={false} maxSize={BACKGROUND_MAX_SIZE} showLockToBoard />
    </div>
  );
};

export default LayersView;
