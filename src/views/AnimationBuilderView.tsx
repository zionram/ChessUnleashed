import React, { useMemo, useState } from 'react';
import AnimationPreviewCard from '../components/animation/AnimationPreviewCard';
import { useSettings, type AnimationDefinition, type AnimationPresetType, type AnimationTargetType, type PieceAnimationSettings } from '../context/SettingsContext';

type BuilderLayer = 'simple' | 'advanced' | 'system';

const presetOptions: Array<{ value: AnimationPresetType; label: string }> = [
  { value: 'snap', label: 'Snap / No Animation' },
  { value: 'slide', label: 'Slide' },
  { value: 'fast-slide', label: 'Fast Slide' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'hop', label: 'Hop' },
  { value: 'shake', label: 'Shake' },
  { value: 'pulse', label: 'Pulse' },
  { value: 'capture-pop', label: 'Capture Pop' },
  { value: 'promotion-glow', label: 'Promotion Glow' },
  { value: 'board-flash', label: 'Board Flash' }
];

const targetOptions: Array<{ value: AnimationTargetType; label: string }> = [
  { value: 'piece', label: 'Piece' },
  { value: 'captured-piece', label: 'Captured Piece' },
  { value: 'promoted-piece', label: 'Promoted Piece' },
  { value: 'board', label: 'Board' },
  { value: 'ui', label: 'UI' }
];

const easingOptions: Array<{ value: PieceAnimationSettings['easing']; label: string }> = [
  { value: 'ease-in-out', label: 'Smooth' },
  { value: 'ease', label: 'Soft' },
  { value: 'linear', label: 'Direct' }
];

const makeCustomAnimation = (base?: AnimationDefinition): AnimationDefinition => {
  const now = Date.now();
  return {
    id: `anim-custom-${now}`,
    name: base ? `${base.name} Copy` : 'Custom Animation',
    description: base?.description ?? 'Reusable animation definition.',
    category: base?.category ?? 'Movement',
    preset: base?.preset ?? 'slide',
    targetType: base?.targetType ?? 'piece',
    durationMs: base?.durationMs ?? 220,
    delayMs: base?.delayMs ?? 0,
    easing: base?.easing ?? 'ease-in-out',
    intensity: base?.intensity ?? 0.5,
    repeatCount: base?.repeatCount ?? 1,
    enabled: base?.enabled ?? true,
    status: 'draft'
  };
};

const validateAnimation = (definition: AnimationDefinition) => {
  const issues: string[] = [];
  if (!definition.name.trim()) issues.push('Animation name is required.');
  if (!definition.id.trim()) issues.push('Animation ID is required.');
  if (definition.durationMs < 0) issues.push('Duration cannot be negative.');
  if (definition.delayMs < 0) issues.push('Delay cannot be negative.');
  if (definition.repeatCount < 1) issues.push('Repeat count must be at least 1.');
  return issues;
};

const AnimationBuilderView: React.FC = () => {
  const {
    settings,
    createAnimationDefinition,
    updateAnimationDefinition,
    deleteAnimationDefinition,
    updatePieceAnimations
  } = useSettings();
  const [layer, setLayer] = useState<BuilderLayer>('simple');
  const [selectedId, setSelectedId] = useState(settings.pieceAnimations.defaultAnimationId || settings.animationDefinitions[0]?.id || '');
  const [draft, setDraft] = useState<AnimationDefinition>(() =>
    settings.animationDefinitions.find(animation => animation.id === selectedId) ?? makeCustomAnimation()
  );

  const selected = settings.animationDefinitions.find(animation => animation.id === selectedId);
  const validationIssues = validateAnimation(draft);
  const isBuiltin = Boolean(selected?.builtin || draft.builtin);

  const sortedDefinitions = useMemo(() => [...settings.animationDefinitions].sort((a, b) => Number(Boolean(a.builtin)) - Number(Boolean(b.builtin)) || a.name.localeCompare(b.name)), [settings.animationDefinitions]);

  const selectAnimation = (id: string) => {
    const next = settings.animationDefinitions.find(animation => animation.id === id);
    if (!next) return;
    setSelectedId(id);
    setDraft({ ...next });
  };

  const saveDraft = () => {
    if (validationIssues.length > 0 || isBuiltin) return;
    if (settings.animationDefinitions.some(animation => animation.id === draft.id)) updateAnimationDefinition(draft.id, { ...draft, status: draft.enabled ? 'active' : 'disabled' });
    else createAnimationDefinition({ ...draft, status: draft.enabled ? 'active' : 'disabled' });
    setSelectedId(draft.id);
  };

  const duplicateSelected = () => {
    const copy = makeCustomAnimation(selected || draft);
    createAnimationDefinition(copy);
    setSelectedId(copy.id);
    setDraft(copy);
  };

  const applyAsDefault = () => {
    updatePieceAnimations({
      defaultAnimationId: draft.id,
      enabled: draft.enabled && draft.preset !== 'snap',
      movementSpeedMs: draft.preset === 'snap' ? 0 : draft.durationMs,
      easing: draft.easing
    });
  };

  const layerButtonStyle = (target: BuilderLayer): React.CSSProperties => ({
    padding: '7px 8px',
    borderRadius: 6,
    border: layer === target ? '1px solid #2c3e50' : '1px solid #d0d7de',
    background: layer === target ? '#2c3e50' : '#fff',
    color: layer === target ? '#fff' : '#334155',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.75rem'
  });

  const inputStyle: React.CSSProperties = { width: '100%', marginTop: 4, padding: 7, boxSizing: 'border-box' };

  const renderSimpleFields = () => (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label style={{ fontSize: '0.78rem' }}>Animation Name
        <input value={draft.name} disabled={isBuiltin} onChange={(event) => setDraft({ ...draft, name: event.target.value })} style={inputStyle} />
      </label>
      <label style={{ fontSize: '0.78rem' }}>Preset
        <select value={draft.preset} disabled={isBuiltin} onChange={(event) => setDraft({ ...draft, preset: event.target.value as AnimationPresetType })} style={inputStyle}>
          {presetOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label style={{ fontSize: '0.78rem' }}>Speed: {draft.durationMs}ms
        <input type="range" min="0" max="900" step="20" value={draft.durationMs} disabled={isBuiltin} onChange={(event) => setDraft({ ...draft, durationMs: parseInt(event.target.value, 10) })} style={{ width: '100%' }} />
      </label>
      <label style={{ fontSize: '0.78rem' }}>Intensity: {Math.round(draft.intensity * 100)}%
        <input type="range" min="0" max="1" step="0.05" value={draft.intensity} disabled={isBuiltin} onChange={(event) => setDraft({ ...draft, intensity: parseFloat(event.target.value) })} style={{ width: '100%' }} />
      </label>
    </section>
  );

  const renderAdvancedFields = () => (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label style={{ fontSize: '0.78rem' }}>Description
        <textarea value={draft.description} disabled={isBuiltin} onChange={(event) => setDraft({ ...draft, description: event.target.value })} rows={2} style={inputStyle} />
      </label>
      <label style={{ fontSize: '0.78rem' }}>Target Type
        <select value={draft.targetType} disabled={isBuiltin} onChange={(event) => setDraft({ ...draft, targetType: event.target.value as AnimationTargetType })} style={inputStyle}>
          {targetOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label style={{ fontSize: '0.78rem' }}>Category
        <input value={draft.category} disabled={isBuiltin} onChange={(event) => setDraft({ ...draft, category: event.target.value })} style={inputStyle} />
      </label>
      <label style={{ fontSize: '0.78rem' }}>Easing
        <select value={draft.easing} disabled={isBuiltin} onChange={(event) => setDraft({ ...draft, easing: event.target.value as PieceAnimationSettings['easing'] })} style={inputStyle}>
          {easingOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label style={{ fontSize: '0.78rem' }}>Delay: {draft.delayMs}ms
        <input type="range" min="0" max="1000" step="25" value={draft.delayMs} disabled={isBuiltin} onChange={(event) => setDraft({ ...draft, delayMs: parseInt(event.target.value, 10) })} style={{ width: '100%' }} />
      </label>
      <label style={{ fontSize: '0.78rem' }}>Repeat Count
        <input type="number" min="1" max="8" value={draft.repeatCount} disabled={isBuiltin} onChange={(event) => setDraft({ ...draft, repeatCount: Math.max(1, parseInt(event.target.value, 10) || 1) })} style={inputStyle} />
      </label>
      <label style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '0.78rem' }}>
        Enabled
        <input type="checkbox" checked={draft.enabled} disabled={isBuiltin} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} />
      </label>
    </section>
  );

  const renderSystemFields = () => (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ padding: 8, borderRadius: 6, background: '#eef2ff', color: '#3730a3', fontSize: '0.72rem' }}>
        Event-callable animations can be attached to active custom events from Event Builder. Runtime playback state is temporary and is not saved in packages.
      </div>
      <div style={{ fontSize: '0.75rem' }}><strong>Animation ID:</strong> {draft.id}</div>
      <div style={{ fontSize: '0.75rem' }}><strong>Status:</strong> {validationIssues.length ? 'Invalid' : draft.builtin ? 'Built-in' : draft.enabled ? 'Active' : 'Disabled'}</div>
      {validationIssues.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18, color: '#991b1b', fontSize: '0.72rem' }}>
          {validationIssues.map(issue => <li key={issue}>{issue}</li>)}
        </ul>
      )}
      <pre style={{ maxHeight: 220, overflow: 'auto', padding: 8, background: '#0f172a', color: '#e2e8f0', borderRadius: 6, fontSize: '0.68rem' }}>{JSON.stringify(draft, null, 2)}</pre>
      <button type="button" onClick={() => navigator.clipboard?.writeText(JSON.stringify(draft, null, 2))} style={{ padding: 8, borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer' }}>
        Copy Animation JSON
      </button>
    </section>
  );

  return (
    <div className="view-container" style={{ display: 'grid', gridTemplateColumns: '190px minmax(240px, 1fr) 230px', gap: 12, height: '100%', minHeight: 0 }}>
      <section style={{ border: '1px solid #d0d7de', borderRadius: 8, background: '#fff', padding: 10, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontWeight: 800, fontSize: '0.82rem' }}>Animations</div>
        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Attach enabled animations to events from Event Builder.</div>
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5, paddingRight: 2 }}>
          {sortedDefinitions.map(animation => (
            <button
              key={animation.id}
              type="button"
              onClick={() => selectAnimation(animation.id)}
              style={{
                textAlign: 'left',
                padding: 7,
                borderRadius: 6,
                border: selectedId === animation.id ? '1px solid #4f46e5' : '1px solid #e2e8f0',
                background: selectedId === animation.id ? '#eef2ff' : '#f8fafc',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: '0.72rem', fontWeight: 800 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{animation.name}</span>
                <span style={{ flex: '0 0 auto', color: animation.builtin ? '#475569' : '#166534' }}>{animation.builtin ? 'Built-in' : animation.status}</span>
              </div>
              <div style={{ fontSize: '0.64rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {animation.category} - {animation.preset}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section style={{ minHeight: 0, overflowY: 'auto', border: '1px solid #d0d7de', borderRadius: 8, background: '#fff', padding: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
          <button type="button" onClick={() => setLayer('simple')} style={layerButtonStyle('simple')}>Simple</button>
          <button type="button" onClick={() => setLayer('advanced')} style={layerButtonStyle('advanced')}>Advanced</button>
          <button type="button" onClick={() => setLayer('system')} style={layerButtonStyle('system')}>System</button>
        </div>

        {isBuiltin && (
          <div style={{ padding: 8, borderRadius: 6, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', fontSize: '0.72rem', marginBottom: 10 }}>
            Built-in animations are protected. Duplicate one to make an editable custom animation.
          </div>
        )}

        {layer === 'simple' && renderSimpleFields()}
        {layer === 'advanced' && renderAdvancedFields()}
        {layer === 'system' && renderSystemFields()}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
          <button type="button" onClick={duplicateSelected} style={{ padding: 9, borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>
            Duplicate
          </button>
          <button type="button" onClick={saveDraft} disabled={isBuiltin || validationIssues.length > 0} style={{ padding: 9, borderRadius: 6, border: 'none', background: !isBuiltin && validationIssues.length === 0 ? '#2c3e50' : '#94a3b8', color: '#fff', cursor: !isBuiltin && validationIssues.length === 0 ? 'pointer' : 'not-allowed', fontWeight: 700 }}>
            Save
          </button>
          <button type="button" onClick={applyAsDefault} disabled={validationIssues.length > 0} style={{ padding: 9, borderRadius: 6, border: '1px solid #16a34a', background: '#f0fdf4', color: '#166534', cursor: validationIssues.length === 0 ? 'pointer' : 'not-allowed', fontWeight: 700 }}>
            Use as Default
          </button>
          <button type="button" onClick={() => deleteAnimationDefinition(draft.id)} disabled={isBuiltin} style={{ padding: 9, borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', cursor: isBuiltin ? 'not-allowed' : 'pointer', fontWeight: 700 }}>
            Delete
          </button>
        </div>
      </section>

      <section style={{ minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <AnimationPreviewCard definition={draft} />
        <div style={{ padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.72rem', color: '#475569' }}>
          <div><strong>Callable:</strong> {draft.enabled ? 'Yes' : 'Disabled'}</div>
          <div><strong>Default:</strong> {settings.pieceAnimations.defaultAnimationId === draft.id ? 'Current movement default' : 'Not default'}</div>
          <div><strong>Protected:</strong> {isBuiltin ? 'Built-in preset' : 'Editable custom animation'}</div>
        </div>
      </section>
    </div>
  );
};

export default AnimationBuilderView;
