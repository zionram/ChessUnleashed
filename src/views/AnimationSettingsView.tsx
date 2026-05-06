import React, { useEffect, useMemo, useState } from 'react';
import { useSettings, type PieceAnimationSettings } from '../context/SettingsContext';

const easingOptions: Array<{ label: string; value: PieceAnimationSettings['easing'] }> = [
  { label: 'Smooth', value: 'ease-in-out' },
  { label: 'Direct', value: 'linear' },
  { label: 'Soft', value: 'ease' }
];

const AnimationSettingsView: React.FC = () => {
  const { settings, updatePieceAnimations } = useSettings();
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const [previewRun, setPreviewRun] = useState(0);
  const [previewLoop, setPreviewLoop] = useState(true);
  const { enabled, movementSpeedMs, easing, captureAnimation, promotionAnimation, defaultAnimationId, movementScope } = settings.pieceAnimations;
  const selectedAnimation = settings.animationDefinitions.find(animation => animation.id === defaultAnimationId);
  const scopeLabel = useMemo(() => {
    switch (movementScope) {
      case 'my-pieces':
        return 'My pieces';
      case 'opponent-pieces':
        return 'Opponent pieces';
      case 'white-pieces':
        return 'White pieces';
      case 'black-pieces':
        return 'Black pieces';
      default:
        return 'Both sides / all pieces';
    }
  }, [movementScope]);
  const applyDefaultAnimation = (animationId: string) => {
    const animation = settings.animationDefinitions.find(item => item.id === animationId);
    if (!animation) return;
    updatePieceAnimations({
      defaultAnimationId: animation.id,
      enabled: animation.enabled && animation.preset !== 'snap',
      movementSpeedMs: animation.preset === 'snap' ? 0 : animation.durationMs,
      easing: animation.easing
    });
  };


  useEffect(() => {
    if (!enabled) return;
    setPreviewRun((current) => current + 1);
    if (!previewLoop) return;

    const cycleMs = Math.max(movementSpeedMs + 650, 1100);
    const timer = window.setInterval(() => {
      setPreviewRun((current) => current + 1);
    }, cycleMs);

    return () => window.clearInterval(timer);
  }, [enabled, previewLoop, movementSpeedMs, easing, defaultAnimationId, movementScope]);

  const handleApply = () => {
    updatePieceAnimations({ ...settings.pieceAnimations });
    setApplyMessage(`Updated: ${selectedAnimation?.name ?? 'Animation'} · ${enabled ? 'enabled' : 'disabled'} · ${scopeLabel}.`);
  };

  return (
    <div className="view-container cu-view-shell cu-animation-settings-view" style={{ padding: '16px', minHeight: '100%' }}>
      <div className="cu-stack" style={{ gap: '14px' }}>
        <section className="cu-panel-card cu-pad cu-stack-sm" aria-label="Animation preview">
          <div className="cu-row-between" style={{ alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <h4 className="cu-section-title">Movement Preview</h4>
              <p className="cu-section-subtitle">
                Test the selected movement style before you update the default.
              </p>
            </div>
            <div className="cu-row" style={{ gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <label className="cu-row" style={{ gap: '8px', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={previewLoop}
                  onChange={(event) => setPreviewLoop(event.target.checked)}
                />
                <span className="cu-small">Loop preview</span>
              </label>
              <button
                type="button"
                onClick={() => setPreviewRun((current) => current + 1)}
                disabled={!enabled}
                className="cu-button-primary"
              >
                ▶ Preview Move
              </button>
            </div>
          </div>
          <div
            className="cu-preview-box"
            style={{
              minHeight: '128px',
              position: 'relative',
              overflow: 'hidden',
              padding: '20px 22px 26px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '14px'
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '12%',
                right: '12%',
                height: '2px',
                background: 'linear-gradient(90deg, rgba(56,189,248,0.08), rgba(56,189,248,0.75), rgba(56,189,248,0.08))',
                top: '50%'
              }}
            />
            <div
              key={previewRun}
              aria-hidden="true"
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                display: 'grid',
                placeItems: 'center',
                background: 'rgba(56,189,248,0.16)',
                border: '1px solid rgba(56,189,248,0.38)',
                boxShadow: '0 0 20px rgba(56,189,248,0.18)',
                fontSize: '1.5rem',
                zIndex: 1,
                transform: previewRun ? 'translateX(calc(100% + 260px))' : 'translateX(0)',
                transition: previewRun ? `transform ${Math.max(movementSpeedMs, 80)}ms ${easing}` : 'none'
              }}
            >
              ♘
            </div>
            <div
              style={{
                position: 'absolute',
                left: 22,
                bottom: 12,
                fontSize: '0.82rem',
                color: 'rgba(226,232,240,0.86)'
              }}
            >
              {enabled ? `${selectedAnimation?.name ?? 'Slide'} · ${movementSpeedMs}ms · ${previewLoop ? 'Looping' : 'Single run'}` : 'Animation preview is off'}
            </div>
            <div
              className="cu-status-pill"
              style={{ position: 'absolute', right: 12, bottom: 10 }}
            >
              {enabled ? scopeLabel : 'Off'}
            </div>
          </div>
        </section>

        <section className="cu-panel-card cu-pad cu-stack-sm">
          <div className="cu-grid-2" style={{ gap: '14px', alignItems: 'start' }}>
            <label className="cu-field cu-stack-xs">
              <span className="cu-strong">Movement Style</span>
              <select
                className="cu-select"
                value={defaultAnimationId || 'anim-slide'}
                onChange={(event) => applyDefaultAnimation(event.target.value)}
              >
                {settings.animationDefinitions.filter(animation => animation.targetType === 'piece').map(animation => (
                  <option key={animation.id} value={animation.id}>{animation.name}</option>
                ))}
              </select>
            </label>

            <label className="cu-field cu-stack-xs">
              <span className="cu-strong">Apply To</span>
              <select
                className="cu-select"
                value={movementScope}
                disabled={!enabled}
                onChange={(event) => updatePieceAnimations({ movementScope: event.target.value as PieceAnimationSettings['movementScope'] })}
              >
                <option value="all">Both sides / all pieces</option>
                <option value="my-pieces">My pieces</option>
                <option value="opponent-pieces">Opponent pieces</option>
                <option value="white-pieces">White pieces</option>
                <option value="black-pieces">Black pieces</option>
              </select>
            </label>
          </div>

          <div className="cu-grid-2" style={{ gap: '14px', alignItems: 'center' }}>
            <label className="cu-row-between cu-card-muted cu-pad-sm" style={{ minHeight: '44px' }}>
              <span className="cu-strong">Animate Moves</span>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => updatePieceAnimations({ enabled: event.target.checked })}
              />
            </label>

            <label className="cu-field cu-stack-xs">
              <span className="cu-strong">Easing</span>
              <select
                className="cu-select"
                value={easing}
                disabled={!enabled}
                onChange={(event) => updatePieceAnimations({ easing: event.target.value as PieceAnimationSettings['easing'] })}
              >
                {easingOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="cu-field cu-stack-xs">
            <div className="cu-row-between">
              <span className="cu-strong">Speed</span>
              <strong>{movementSpeedMs}ms</strong>
            </div>
            <input
              type="range"
              min="80"
              max="700"
              step="20"
              value={movementSpeedMs}
              disabled={!enabled}
              onChange={(event) => updatePieceAnimations({ movementSpeedMs: parseInt(event.target.value, 10) })}
            />
          </div>

          <div className="cu-grid-2" style={{ gap: '12px' }}>
            <label className="cu-row-between cu-card-muted cu-pad-sm">
              <span>Capture Animation</span>
              <input
                type="checkbox"
                checked={captureAnimation}
                disabled={!enabled}
                onChange={(event) => updatePieceAnimations({ captureAnimation: event.target.checked })}
              />
            </label>
            <label className="cu-row-between cu-card-muted cu-pad-sm">
              <span>Promotion Animation</span>
              <input
                type="checkbox"
                checked={promotionAnimation}
                disabled={!enabled}
                onChange={(event) => updatePieceAnimations({ promotionAnimation: event.target.checked })}
              />
            </label>
          </div>
        </section>

        <section className="cu-panel-card-muted cu-pad cu-stack-sm">
          <div className="cu-row-between">
            <strong>Saved Default</strong>
            <button onClick={handleApply} className="cu-button-primary">
              Update
            </button>
          </div>
          <div className="cu-small cu-muted" style={{ lineHeight: 1.45 }}>
            <div>{enabled ? 'Enabled' : 'Disabled'} · {selectedAnimation?.name ?? 'Slide'} · {scopeLabel}</div>
            <div>Speed {movementSpeedMs}ms · {easing}</div>
            <div>Capture {captureAnimation ? 'On' : 'Off'} · Promotion {promotionAnimation ? 'On' : 'Off'}</div>
          </div>
          {applyMessage && <div className="cu-notice cu-notice-success">{applyMessage}</div>}
        </section>
      </div>
    </div>
  );
};

export default AnimationSettingsView;
