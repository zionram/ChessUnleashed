import React from 'react';
import { useSettings, type PieceAnimationSettings } from '../context/SettingsContext';

const easingOptions: Array<{ label: string; value: PieceAnimationSettings['easing'] }> = [
  { label: 'Smooth', value: 'ease-in-out' },
  { label: 'Direct', value: 'linear' },
  { label: 'Soft', value: 'ease' }
];

const AnimationSettingsView: React.FC = () => {
  const { settings, updatePieceAnimations } = useSettings();
  const { enabled, movementSpeedMs, easing, captureAnimation, promotionAnimation, defaultAnimationId } = settings.pieceAnimations;
  const selectedAnimation = settings.animationDefinitions.find(animation => animation.id === defaultAnimationId);

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
      </div>

      <p style={{ fontSize: '0.7rem', color: '#666', marginTop: '12px' }}>
        Standard Chess pieces use the selected default movement animation. Snap / No Animation maps to immediate board updates.
        {selectedAnimation ? ` Current default: ${selectedAnimation.name}.` : ''}
      </p>
    </div>
  );
};

export default AnimationSettingsView;
