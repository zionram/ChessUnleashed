import React, { useState } from 'react';
import type { AnimationDefinition } from '../../context/SettingsContext';

interface AnimationPreviewCardProps {
  definition?: AnimationDefinition;
  compact?: boolean;
}

const getPreviewStyle = (definition: AnimationDefinition): React.CSSProperties => ({
  animation: definition.preset === 'snap' || !definition.enabled
    ? 'none'
    : `animation-preview-${definition.preset} ${Math.max(80, definition.durationMs)}ms ${definition.easing} ${definition.delayMs}ms ${definition.repeatCount}`,
  transformOrigin: 'center',
  opacity: definition.enabled ? 1 : 0.45
});

const AnimationPreviewCard: React.FC<AnimationPreviewCardProps> = ({ definition, compact = false }) => {
  const [previewKey, setPreviewKey] = useState(0);

  if (!definition) {
    return (
      <div style={{ padding: 10, borderRadius: 8, border: '1px dashed rgba(148, 163, 184, 0.28)', color: '#94a3b8', fontSize: '0.75rem' }}>
        Choose an animation to preview it.
      </div>
    );
  }

  return (
    <div style={{ padding: compact ? 8 : 12, border: '1px solid rgba(148, 163, 184, 0.20)', borderRadius: 8, background: 'rgba(8, 18, 34, 0.86)', color: '#dbeafe' }}>
      <style>{`
        @keyframes animation-preview-slide { from { transform: translateX(-32px); } to { transform: translateX(32px); } }
        @keyframes animation-preview-fast-slide { from { transform: translateX(-38px); } to { transform: translateX(38px); } }
        @keyframes animation-preview-bounce { 0% { transform: translateX(-30px) scale(1); } 55% { transform: translateX(20px) scale(1.12); } 100% { transform: translateX(32px) scale(1); } }
        @keyframes animation-preview-hop { 0% { transform: translate(-32px, 0); } 50% { transform: translate(0, -18px); } 100% { transform: translate(32px, 0); } }
        @keyframes animation-preview-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
        @keyframes animation-preview-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.22); } }
        @keyframes animation-preview-capture-pop { 0% { transform: scale(0.8); opacity: 0.5; } 70% { transform: scale(1.22); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes animation-preview-promotion-glow { 0%, 100% { box-shadow: 0 0 0 rgba(250, 204, 21, 0); } 50% { box-shadow: 0 0 18px rgba(250, 204, 21, 0.95); } }
        @keyframes animation-preview-board-flash { 0%, 100% { background: rgba(8, 18, 34, 0.86); } 50% { background: rgba(250, 204, 21, 0.58); } }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 800, color: '#e2e8f0', fontSize: compact ? '0.75rem' : '0.86rem' }}>{definition.name}</div>
          <div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>{definition.preset} - {definition.durationMs}ms - {definition.enabled ? 'enabled' : 'disabled'}</div>
        </div>
        <button type="button" onClick={() => setPreviewKey(key => key + 1)} style={{ padding: compact ? '5px 7px' : '7px 10px', borderRadius: 6, border: '1px solid rgba(148, 163, 184, 0.24)', background: 'rgba(15, 23, 42, 0.72)', color: '#dbeafe', cursor: 'pointer', fontWeight: 700, fontSize: compact ? '0.68rem' : '0.75rem' }}>
          Test Preview
        </button>
      </div>
      <div style={{ height: compact ? 58 : 118, borderRadius: 8, border: '1px solid rgba(148, 163, 184, 0.18)', background: definition.preset === 'board-flash' ? 'rgba(8, 18, 34, 0.86)' : 'rgba(2, 8, 23, 0.52)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div key={previewKey} style={getPreviewStyle(definition)}>
          <div style={{ width: compact ? 28 : 42, height: compact ? 28 : 42, borderRadius: 7, background: definition.preset === 'board-flash' ? 'rgba(250, 204, 21, 0.78)' : '#22364f', color: definition.preset === 'board-flash' ? '#0f172a' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
            A
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimationPreviewCard;
