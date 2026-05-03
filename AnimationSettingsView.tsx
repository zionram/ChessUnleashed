import React, { useMemo, useState } from 'react';
import { useSettings, type PieceAnimationSettings } from '../context/SettingsContext';

const easingOptions: Array<{ label: string; value: PieceAnimationSettings['easing'] }> = [
  { label: 'Smooth', value: 'ease-in-out' },
  { label: 'Direct', value: 'linear' },
  { label: 'Soft', value: 'ease' }
];

const AnimationSettingsView: React.FC = () => {
  const { settings, updatePieceAnimations } = useSettings();
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
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

  const handleApply = () => {
    updatePieceAnimations({ ...settings.pieceAnimations });
    setApplyMessage(`Updated: ${selectedAnimation?.name ?? 'Animation'} · ${enabled ? 'enabled' : 'disabled'} · ${scopeLabel}.`);
  };

  return (
    <div className="view-container">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', fontSize: '0.85rem' }}>
          Default Movement
          <select
            value={defaultAnimationId || 'anim-slide'}
            onChange={(event) => applyDefaultAnimation(event.target.value)}
            style={{ padding: '4px', fontSize: '0.8rem', maxWidth: '170px' }}
          >
            {settings.animationDefinitions.filter(animation => animation.targetType === 'piece').map(animation => (
              <option key={animation.id} value={animation.id}>{animation.name}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', fontSize: '0.85rem' }}>
          Animate Piece Movement
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => updatePieceAnimations({ enabled: event.target.checked })}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
          Movement Animation Scope
          <select
            value={movementScope}
            disabled={!enabled}
            onChange={(event) => updatePieceAnimations({ movementScope: event.target.value as PieceAnimationSettings['movementScope'] })}
            style={{ padding: '6px', fontSize: '0.8rem' }}
          >
            <option value="all">Both sides / all pieces</option>
            <option value="my-pieces">My pieces</option>
            <option value="opponent-pieces">Opponent pieces</option>
            <option value="white-pieces">White pieces</option>
            <option value="black-pieces">Black pieces</option>
          </select>
          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
            My/Opponent uses your active side in bot or multiplayer games. In local two-player mode it falls back to both sides.
          </span>
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.85rem' }}>
            <span>Movement Speed</span>
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

        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', fontSize: '0.85rem' }}>
          Easing
          <select
            value={easing}
            disabled={!enabled}
            onChange={(event) => updatePieceAnimations({ easing: event.target.value as PieceAnimationSettings['easing'] })}
            style={{ padding: '4px', fontSize: '0.8rem' }}
          >
            {easingOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', fontSize: '0.85rem' }}>
          Capture Animation
          <input
            type="checkbox"
            checked={captureAnimation}
            disabled={!enabled}
            onChange={(event) => updatePieceAnimations({ captureAnimation: event.target.checked })}
          />
        </label>

        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', fontSize: '0.85rem' }}>
          Promotion Animation
          <input
            type="checkbox"
            checked={promotionAnimation}
            disabled={!enabled}
            onChange={(event) => updatePieceAnimations({ promotionAnimation: event.target.checked })}
          />
        </label>

        <div style={{
          background: 'rgba(255,255,255,0.8)',
          border: '1px solid rgba(148,163,184,0.35)',
          borderRadius: '8px',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <strong style={{ fontSize: '0.82rem' }}>Current Active Default</strong>
            <button
              onClick={handleApply}
              style={{ padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              Update Animation Settings
            </button>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#1f2937', lineHeight: 1.45 }}>
            <div>{enabled ? 'Enabled' : 'Disabled'} · {selectedAnimation?.name ?? 'Slide'} · {scopeLabel}</div>
            <div>Movement speed: {movementSpeedMs}ms · Easing: {easing}</div>
            <div>Capture: {captureAnimation ? 'On' : 'Off'} · Promotion: {promotionAnimation ? 'On' : 'Off'}</div>
            <div style={{ color: '#475569' }}>Priority: Event-triggered animations override this default movement animation. Snap remains the fallback.</div>
          </div>
          {applyMessage && (
            <div style={{ fontSize: '0.75rem', color: '#0f766e' }}>{applyMessage}</div>
          )}
        </div>
      </div>

      <p style={{ fontSize: '0.7rem', color: '#666', marginTop: '12px' }}>
        Standard Chess pieces use the selected default movement animation and movement scope. Snap / No Animation maps to immediate board updates.
        {selectedAnimation ? ` Current default: ${selectedAnimation.name}.` : ''}
      </p>
    </div>
  );
};

export default AnimationSettingsView;
