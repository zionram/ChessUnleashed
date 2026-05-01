import React, { memo, useState } from 'react';
import type { PressureSource } from '../../utils/pressureEngine';
import Piece from './Piece';
import { useSettings } from '../../context/SettingsContext';

interface SquareProps {
  square: string;
  piece?: { type: string; color: string } | null;
  isDark: boolean;
  whitePressure: PressureSource[];
  blackPressure: PressureSource[];
  activePathSources: PressureSource[];
  onSquareClick: (square: string) => void;
  onBadgeHover: (sources: PressureSource[]) => void;
  onBadgeLeave: () => void;
  isSelected: boolean;
  isMoveTarget: boolean;
  hidePiece?: boolean;
}

const Square: React.FC<SquareProps> = ({
  square,
  piece,
  isDark,
  whitePressure,
  blackPressure,
  activePathSources,
  onSquareClick,
  onBadgeHover,
  onBadgeLeave,
  isSelected,
  isMoveTarget,
  hidePiece = false,
}) => {
  const { settings, updateThemeDraft } = useSettings();
  const [isOver, setIsOver] = useState(false);
  
  if (!settings || !settings.template) {
    return <div className="square-placeholder" style={{ aspectRatio: '1/1', background: '#ccc' }} />;
  }

  const { boardColors, pathStyle, badgeColors, boardOverlay } = settings.template;
  
  const baseOpacity = boardOverlay.image ? Math.max(0, Math.min(1, 1 - boardOverlay.opacity)) : 1;
  const highlightOpacity = 0.6;
  
  const bgColor = isSelected 
    ? boardColors.selected 
    : isMoveTarget 
      ? boardColors.moveTarget 
      : isDark ? boardColors.dark : boardColors.light;
  
  const currentOpacity = (isSelected || isMoveTarget) ? highlightOpacity : baseOpacity;
  
  const isWhitePiece = piece?.color === 'w';
  const isBlackPiece = piece?.color === 'b';
  const attackers = isWhitePiece ? blackPressure : isBlackPiece ? whitePressure : [];
  const defenders = isWhitePiece ? whitePressure : isBlackPiece ? blackPressure : [];
  const comfort = defenders.length - attackers.length;

  const renderPathIcon = (source: PressureSource) => {
    const color = pathStyle.colors[source.type] || '#000';
    const style = { color, opacity: 0.9, fontSize: '1.2rem', textShadow: '0 0 2px #fff' };
    if (pathStyle.icon === 'diamond') return <span style={style}>◆</span>;
    if (pathStyle.icon === 'square') return <span style={style}>■</span>;
    return <span style={style}>●</span>;
  };

  const activeSourcesOnThisSquare = activePathSources.filter(s => s.path.includes(square) || s.square === square);

  // Drag and Drop Logic for Editor
  const onDragOver = (e: React.DragEvent) => {
    if (!settings.isThemeEditorMode) return;
    e.preventDefault();
    setIsOver(true);
  };

  const onDragLeave = () => setIsOver(false);

  const onDrop = (e: React.DragEvent) => {
    if (!settings.isThemeEditorMode) return;
    e.preventDefault();
    setIsOver(false);

    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 3 * 1024 * 1024) {
      alert("Image too large (max 3MB)");
      return;
    }

    const EDITOR_LAYOUT: Record<string, string> = {
      'a8': 'wr', 'b8': 'wn', 'c8': 'wb', 'd8': 'wq', 'e8': 'wk', 'f8': 'wp',
      'a7': 'br', 'b7': 'bn', 'c7': 'bb', 'd7': 'bq', 'e7': 'bk', 'f7': 'bp'
    };
    const pieceKey = EDITOR_LAYOUT[square];
    if (!pieceKey) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const currentPieceTheme = settings.themeDraft?.pieceTheme || settings.template.pieceTheme;
      updateThemeDraft({
        pieceTheme: {
          ...currentPieceTheme,
          customPieces: { ...currentPieceTheme.customPieces, [pieceKey]: dataUrl }
        }
      });
    };
    reader.readAsDataURL(file);
  };

  const isPieceEditorMode = settings.isThemeEditorMode;
  const isEditableSlot = isPieceEditorMode && (square.startsWith('a') || square.startsWith('b') || square.startsWith('c') || square.startsWith('d') || square.startsWith('e') || square.startsWith('f')) && (square.endsWith('8') || square.endsWith('7'));

  return (
    <div
      className={`square ${isEditableSlot ? 'editable-slot' : ''}`}
      title={isEditableSlot ? "Click to select or Drop image to upload" : ""}
      style={{
        width: '100%',
        aspectRatio: '1/1',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isEditableSlot ? 'copy' : 'pointer',
        userSelect: 'none',
        outline: isOver ? '3px solid #3498db' : 'none',
        boxShadow: isOver ? 'inset 0 0 20px rgba(52, 152, 219, 0.5)' : 'none',
        outlineOffset: '-3px',
        transition: 'all 0.2s ease'
      }}
      onClick={() => onSquareClick(square)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <style>{`
        .editable-slot:hover {
          outline: 2px dashed rgba(52, 152, 219, 0.7) !important;
          outline-offset: -4px;
        }
      `}</style>
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: bgColor,
        opacity: currentOpacity,
        zIndex: 0
      }} />

      <div style={{ 
        position: 'absolute', 
        top: 0, left: 0, width: '100%', height: '100%', 
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 20,
        pointerEvents: 'none'
      }}>
        <div style={{ width: '85%', height: '85%', zIndex: 1, position: 'relative', pointerEvents: 'none' }}>
          {piece && !hidePiece && <Piece type={piece.type} color={piece.color} comfort={comfort} />}
        </div>

        <div style={{ position: 'absolute', zIndex: 10, display: 'flex', gap: '2px' }}>
          {activeSourcesOnThisSquare.map((s, i) => (
            <React.Fragment key={i}>{renderPathIcon(s)}</React.Fragment>
          ))}
        </div>

        {settings.trainingWheels && piece && (
          <>
            {defenders.length > 0 && (
              <div
                className="badge defender-badge"
                onMouseEnter={() => onBadgeHover(defenders)}
                onMouseLeave={onBadgeLeave}
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  backgroundColor: badgeColors.defender,
                  color: 'white',
                  fontSize: '0.7rem',
                  padding: '1px 4px',
                  borderRadius: '3px',
                  zIndex: 11,
                  cursor: 'help',
                  pointerEvents: 'auto'
                }}
              >
                {defenders.length}
              </div>
            )}
            {attackers.length > 0 && (
              <div
                className="badge attacker-badge"
                onMouseEnter={() => onBadgeHover(attackers)}
                onMouseLeave={onBadgeLeave}
                style={{
                  position: 'absolute',
                  bottom: '2px',
                  right: '2px',
                  backgroundColor: badgeColors.attacker,
                  color: 'white',
                  fontSize: '0.7rem',
                  padding: '1px 4px',
                  borderRadius: '3px',
                  zIndex: 11,
                  cursor: 'help',
                  pointerEvents: 'auto'
                }}
              >
                {attackers.length}
              </div>
            )}
          </>
        )}

        <div style={{ position: 'absolute', bottom: '2px', left: '2px', fontSize: '0.6rem', opacity: 0.5, zIndex: 10 }}>
          {square}
        </div>
      </div>
    </div>
  );
};

export default memo(Square);
