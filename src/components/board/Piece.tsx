import React, { memo } from 'react';
import { useSettings } from '../../context/SettingsContext';

interface PieceProps {
  type: string;
  color: string;
  comfort?: number;
}

const Piece: React.FC<PieceProps> = ({ type, color, comfort = 0 }) => {
  const { settings } = useSettings();
  
  if (!settings || !settings.template) {
    return null;
  }

  // Editor preview can use the draft, but gameplay always uses committed settings.template.
  const currentTemplate = settings.isThemeEditorMode && settings.themeDraft ? settings.themeDraft : settings.template;
  const { pieceThemeMode, pieceTheme, whitePieceTheme, blackPieceTheme } = currentTemplate;
  const pieceKey = `${color}${type.toLowerCase()}`;

  // Determine active config for this side
  let activePieceConfig = pieceTheme;
  if (pieceThemeMode === 'team') {
    activePieceConfig = color === 'w' ? (whitePieceTheme || pieceTheme) : (blackPieceTheme || pieceTheme);
  }

  // Choose image based on variants
  let displayImage = '';
  
  if (activePieceConfig?.type === 'custom') {
    // Clamp comfort for variant resolution only (-7 to +7)
    const clampedComfort = Math.max(-7, Math.min(7, comfort));

    // 1. Check variants first
    const variants = activePieceConfig.customVariants?.[pieceKey] || [];
    if (variants.length > 0) {
      // Find the most specific matching rule
      const matchingRules = variants.filter(rule => {
        if (rule.operator === '>=') return clampedComfort >= rule.threshold;
        if (rule.operator === '<=') return clampedComfort <= rule.threshold;
        if (rule.operator === '>') return clampedComfort > rule.threshold;
        if (rule.operator === '<') return clampedComfort < rule.threshold;
        if (rule.operator === '=') return clampedComfort === rule.threshold;
        return false;
      });

      if (matchingRules.length > 0) {
        // Pick the one with the highest threshold (absolute) for that direction
        matchingRules.sort((a, b) => Math.abs(b.threshold) - Math.abs(a.threshold));
        displayImage = matchingRules[0].image;
      }
    }

    // 2. Fallback to default custom image
    if (!displayImage) {
      displayImage = activePieceConfig.customPieces[pieceKey] || '';
    }
  }

  if (displayImage) {
    return (
      <img
        src={displayImage}
        alt={`${color === 'w' ? 'White' : 'Black'} ${type}`}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          userSelect: 'none',
          pointerEvents: 'none'
        }}
      />
    );
  }

  // Builtin Mode / Default Fallback
  const pieceSet = activePieceConfig?.builtinSet || currentTemplate.pieceSet || 'cburnett';
  const pieceCode = `${color}${type.toUpperCase()}`;
  const imageUrl = `https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/${pieceSet}/${pieceCode}.svg`;

  return (
    <img
      src={imageUrl}
      alt={`${color === 'w' ? 'White' : 'Black'} ${type}`}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        userSelect: 'none',
        pointerEvents: 'none'
      }}
    />
  );
};

export default memo(Piece);
