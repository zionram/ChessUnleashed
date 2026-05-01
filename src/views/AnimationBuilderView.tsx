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
  { value: 'piece', label: 'Any piece / movement default' },
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

const filterOptions = ['All', 'Movement', 'Capture', 'Feedback', 'Promotion', 'Board', 'Custom'];

const makeCustomAnimation = (base?: AnimationDefinition): AnimationDefinition => {
  const now = Date.now();
  return {
    id: `anim-custom-${now}`,
    name: base ? `${base.name} Copy` : 'Custom Animation',
    description: base?.description ?? 'Reusable animation definition.',
    category: base?.category ?? 'Custom',
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

const statusLabel = (definition: AnimationDefinition) => {
  if (definition.builtin) return 'Built-in';
  if (!definition.enabled) return 'Disabled';
  return definition.status === 'draft' ? 'Draft' : 'Active';
};

const AnimationBuilderView: React.FC = () => {
  const {
    settings,
    toggleView,
    createAnimationDefinition,
    updateAnimationDefinition,
    deleteAnimationDefinition,
    updatePieceAnimations
  } = useSettings();
  const [filter, setFilter] = useState('All');
  const [previewId, setPreviewId] = useState(settings.pieceAnimations.defaultAnimationId || settings.animationDefinitions[0]?.id || '');
  const [previewNonce, setPreviewNonce] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [layer, setLayer] = useState<BuilderLayer>('simple');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AnimationDefinition>(() => makeCustomAnimation());

  const sortedDefinitions = useMemo(() => [...settings.animationDefinitions].sort((a, b) => Number(Boolean(a.builtin)) - Number(Boolean(b.builtin)) || a.name.localeCompare(b.name)), [settings.animationDefinitions]);
  const visibleDefinitions = useMemo(() => sortedDefinitions.filter(animation => {
    if (filter === 'All') return true;
    if (filter === 'Custom') return !animation.builtin;
    return animation.category.toLowerCase().includes(filter.toLowerCase());
  }), [sortedDefinitions, filter]);
  const previewDefinition = settings.animationDefinitions.find(animation => animation.id === previewId) ?? visibleDefinitions[0] ?? settings.animationDefinitions[0];
  const validationIssues = validateAnimation(draft);
  const editingBuiltin = Boolean(draft.builtin);

  const openNew = () => {
    setDraft(makeCustomAnimation());
    setEditingId(null);
    setLayer('simple');
    setEditorOpen(true);
  };

  const openEdit = (animation: AnimationDefinition) => {
    setDraft({ ...animation });
    setEditingId(animation.id);
    setLayer('simple');
    setEditorOpen(true);
  };

  const duplicateAnimation = (animation: AnimationDefinition) => {
    const copy = makeCustomAnimation(animation);
    createAnimationDefinition(copy);
    setPreviewId(copy.id);
    setDraft(copy);
    setEditingId(copy.id);
    setLayer('simple');
    setEditorOpen(true);
  };

  const saveDraft = () => {
    if (validationIssues.length > 0 || editingBuiltin) return;
    const next = { ...draft, status: draft.enabled ? 'active' : 'disabled' } as AnimationDefinition;
    if (editingId && settings.animationDefinitions.some(animation => animation.id === editingId)) updateAnimationDefinition(editingId, next);
    else createAnimationDefinition(next);
    setPreviewId(next.id);
    setEditorOpen(false);
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

  const fieldStyle: React.CSSProperties = { width: '100%', marginTop: 4, padding: 7, boxSizing: 'border-box', border: '1px solid #d0d7de', borderRadius: 6 };
  const rowButtonStyle: React.CSSProperties = { padding: '5px 8px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 };
  const previewAnimation = (animationId: string) => {
    setPreviewId(animationId);
    setPreviewNonce(current => current + 1);
  };

  const renderSimpleFields = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <label style={{ fontSize: '0.78rem' }}>Name
        <input value={draft.name} disabled={editingBuiltin} onChange={(event) => setDraft({ ...draft, name: event.target.value })} style={fieldStyle} />
      </label>
      <label style={{ fontSize: '0.78rem' }}>Preset
        <select value={draft.preset} disabled={editingBuiltin} onChange={(event) => setDraft({ ...draft, preset: event.target.value as AnimationPresetType })} style={fieldStyle}>
          {presetOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label style={{ fontSize: '0.78rem' }}>Target
        <select value={draft.targetType} disabled={editingBuiltin} onChange={(event) => setDraft({ ...draft, targetType: event.target.value as AnimationTargetType })} style={fieldStyle}>
          {targetOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label style={{ fontSize: '0.78rem' }}>Category
        <input value={draft.category} disabled={editingBuiltin} onChange={(event) => setDraft({ ...draft, category: event.target.value })} style={fieldStyle} />
      </label>
      <label style={{ fontSize: '0.78rem' }}>Speed: {draft.durationMs}ms
        <input type="range" min="0" max="900" step="20" value={draft.durationMs} disabled={editingBuiltin} onChange={(event) => setDraft({ ...draft, durationMs: parseInt(event.target.value, 10) })} style={{ width: '100%' }} />
      </label>
      <label style={{ fontSize: '0.78rem' }}>Intensity: {Math.round(draft.intensity * 100)}%
        <input type="range" min="0" max="1" step="0.05" value={draft.intensity} disabled={editingBuiltin} onChange={(event) => setDraft({ ...draft, intensity: parseFloat(event.target.value) })} style={{ width: '100%' }} />
      </label>
    </div>
  );

  const renderAdvancedFields = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <label style={{ gridColumn: '1 / -1', fontSize: '0.78rem' }}>Description
        <textarea value={draft.description} disabled={editingBuiltin} onChange={(event) => setDraft({ ...draft, description: event.target.value })} rows={2} style={fieldStyle} />
      </label>
      <label style={{ fontSize: '0.78rem' }}>Duration: {draft.durationMs}ms
        <input type="range" min="0" max="1200" step="20" value={draft.durationMs} disabled={editingBuiltin} onChange={(event) => setDraft({ ...draft, durationMs: parseInt(event.target.value, 10) })} style={{ width: '100%' }} />
      </label>
      <label style={{ fontSize: '0.78rem' }}>Delay: {draft.delayMs}ms
        <input type="range" min="0" max="1000" step="25" value={draft.delayMs} disabled={editingBuiltin} onChange={(event) => setDraft({ ...draft, delayMs: parseInt(event.target.value, 10) })} style={{ width: '100%' }} />
      </label>
      <label style={{ fontSize: '0.78rem' }}>Easing
        <select value={draft.easing} disabled={editingBuiltin} onChange={(event) => setDraft({ ...draft, easing: event.target.value as PieceAnimationSettings['easing'] })} style={fieldStyle}>
          {easingOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label style={{ fontSize: '0.78rem' }}>Repeat
        <input type="number" min="1" max="8" value={draft.repeatCount} disabled={editingBuiltin} onChange={(event) => setDraft({ ...draft, repeatCount: Math.max(1, parseInt(event.target.value, 10) || 1) })} style={fieldStyle} />
      </label>
      <label style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '0.78rem' }}>
        Enabled
        <input type="checkbox" checked={draft.enabled} disabled={editingBuiltin} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} />
      </label>
    </div>
  );

  const renderSystemFields = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ padding: 8, borderRadius: 6, background: '#eef2ff', color: '#3730a3', fontSize: '0.72rem' }}>
        Animation definitions are reusable settings. Runtime playback state is not saved in packages.
      </div>
      <div style={{ fontSize: '0.75rem' }}><strong>Animation ID:</strong> {draft.id}</div>
      <div style={{ fontSize: '0.75rem' }}><strong>Status:</strong> {validationIssues.length ? 'Invalid' : statusLabel(draft)}</div>
      {validationIssues.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18, color: '#991b1b', fontSize: '0.72rem' }}>
          {validationIssues.map(issue => <li key={issue}>{issue}</li>)}
        </ul>
      )}
      <pre style={{ maxHeight: 180, overflow: 'auto', padding: 8, background: '#0f172a', color: '#e2e8f0', borderRadius: 6, fontSize: '0.68rem' }}>{JSON.stringify(draft, null, 2)}</pre>
      <button type="button" onClick={() => navigator.clipboard?.writeText(JSON.stringify(draft, null, 2))} style={rowButtonStyle}>
        Copy JSON
      </button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', padding: 14, boxSizing: 'border-box', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr auto', gap: 8, alignItems: 'center' }}>
        <button type="button" onClick={openNew} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #2c3e50', background: '#2c3e50', color: '#fff', cursor: 'pointer', fontWeight: 800 }}>
          Add Animation
        </button>
        <button type="button" onClick={() => previewDefinition && duplicateAnimation(previewDefinition)} disabled={!previewDefinition} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #d0d7de', background: '#f8fafc', color: '#2c3e50', cursor: previewDefinition ? 'pointer' : 'not-allowed', fontWeight: 800 }}>
          Duplicate Selected
        </button>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {filterOptions.map(option => (
            <button key={option} type="button" onClick={() => setFilter(option)} style={{ padding: '7px 9px', borderRadius: 999, border: filter === option ? '1px solid #2c3e50' : '1px solid #d0d7de', background: filter === option ? '#2c3e50' : '#fff', color: filter === option ? '#fff' : '#334155', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 800 }}>
              {option}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => toggleView('animation-builder')} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer' }}>
          Close
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 12, minHeight: 0, flex: 1 }}>
        <section style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 0.75fr 0.75fr auto auto', gap: 8, padding: '8px 10px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', fontSize: '0.72rem', color: '#475569', fontWeight: 900 }}>
            <span>Animation</span>
            <span>Category / Type</span>
            <span>Target</span>
            <span>Status</span>
            <span>Preview</span>
            <span>Edit</span>
          </div>
          <div style={{ overflowY: 'auto', minHeight: 0 }}>
            {visibleDefinitions.map(animation => (
              <div key={animation.id} style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 0.75fr 0.75fr auto auto', gap: 8, alignItems: 'center', padding: '9px 10px', borderBottom: '1px solid #f1f5f9', fontSize: '0.76rem' }}>
                <div>
                  <div style={{ fontWeight: 900, color: '#2c3e50' }}>{animation.name}</div>
                  <div style={{ color: '#64748b', fontSize: '0.66rem' }}>{animation.description}</div>
                </div>
                <span>{animation.category} / {animation.preset}</span>
                <span>{targetOptions.find(option => option.value === animation.targetType)?.label ?? animation.targetType}</span>
                <span style={{ color: animation.builtin ? '#475569' : animation.enabled ? '#166534' : '#92400e', fontWeight: 800 }}>{statusLabel(animation)}</span>
                <button type="button" onClick={() => previewAnimation(animation.id)} style={rowButtonStyle}>Preview</button>
                <div style={{ display: 'flex', gap: 6 }}>
                  {animation.builtin ? (
                    <button type="button" onClick={() => duplicateAnimation(animation)} style={rowButtonStyle}>Duplicate</button>
                  ) : (
                    <>
                      <button type="button" onClick={() => openEdit(animation)} style={rowButtonStyle}>Edit</button>
                      <button type="button" onClick={() => deleteAnimationDefinition(animation.id)} style={{ ...rowButtonStyle, borderColor: '#fecaca', background: '#fef2f2', color: '#991b1b' }}>Delete</button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {!visibleDefinitions.length && <div style={{ padding: 16, color: '#64748b', fontSize: '0.8rem' }}>No animations match this filter.</div>}
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
          <AnimationPreviewCard key={`${previewDefinition?.id ?? 'none'}-${previewNonce}`} definition={previewDefinition} />
          {previewDefinition && (
            <div style={{ padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.72rem', color: '#475569' }}>
              <div><strong>Callable:</strong> {previewDefinition.enabled ? 'Yes' : 'Disabled'}</div>
              <div><strong>Default:</strong> {settings.pieceAnimations.defaultAnimationId === previewDefinition.id ? 'Current movement default' : 'Not default'}</div>
              <div><strong>Protected:</strong> {previewDefinition.builtin ? 'Built-in preset' : 'Editable custom animation'}</div>
            </div>
          )}
        </section>
      </div>

      {editorOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.42)', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
          <div style={{ width: 'min(860px, 96vw)', maxHeight: '92vh', overflowY: 'auto', background: '#fff', borderRadius: 10, boxShadow: '0 18px 45px rgba(15, 23, 42, 0.28)', padding: 14, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 14 }}>
            <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: '#2c3e50' }}>{editingId ? editingBuiltin ? 'Built-In Animation' : 'Edit Animation' : 'Add Animation'}</div>
                  <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{editingBuiltin ? 'Duplicate built-ins before editing.' : 'Create reusable animations for movement and events.'}</div>
                </div>
                <button type="button" onClick={() => setEditorOpen(false)} style={rowButtonStyle}>Cancel</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                <button type="button" onClick={() => setLayer('simple')} style={layerButtonStyle('simple')}>Simple</button>
                <button type="button" onClick={() => setLayer('advanced')} style={layerButtonStyle('advanced')}>Advanced</button>
                <button type="button" onClick={() => setLayer('system')} style={layerButtonStyle('system')}>System</button>
              </div>

              {editingBuiltin && (
                <div style={{ padding: 8, borderRadius: 6, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', fontSize: '0.72rem' }}>
                  Built-in animations are protected. Use Duplicate to create an editable custom copy.
                </div>
              )}

              {layer === 'simple' && renderSimpleFields()}
              {layer === 'advanced' && renderAdvancedFields()}
              {layer === 'system' && renderSystemFields()}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {editingBuiltin && <button type="button" onClick={() => duplicateAnimation(draft)} style={rowButtonStyle}>Duplicate Built-In</button>}
                <button type="button" onClick={applyAsDefault} disabled={validationIssues.length > 0} style={{ ...rowButtonStyle, borderColor: '#16a34a', background: '#f0fdf4', color: '#166534', cursor: validationIssues.length === 0 ? 'pointer' : 'not-allowed' }}>Use as Default</button>
                <button type="button" onClick={saveDraft} disabled={editingBuiltin || validationIssues.length > 0} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #2c3e50', background: !editingBuiltin && validationIssues.length === 0 ? '#2c3e50' : '#94a3b8', color: '#fff', cursor: !editingBuiltin && validationIssues.length === 0 ? 'pointer' : 'not-allowed', fontWeight: 800 }}>Save Animation</button>
              </div>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <AnimationPreviewCard definition={draft} />
              <div style={{ padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, color: '#475569', fontSize: '0.72rem' }}>
                {validationIssues.length ? validationIssues.join(' ') : 'Animation definition looks ready.'}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnimationBuilderView;
