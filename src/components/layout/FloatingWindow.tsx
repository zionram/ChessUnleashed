import React, { useState, useRef, useEffect, type ReactNode, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import { useSettings } from '../../context/SettingsContext';

interface FloatingWindowProps {
  title: ReactNode;
  children: ReactNode;
  initialPosition?: { x: number; y: number };
  initialSize?: { width: number; height: number };
  onClose?: () => void;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number | string;
  maxHeight?: number | string;
  zIndex?: number;
  className?: string;
  onFocusRequest?: () => void;
  onBoundsChange?: (bounds: { x: number; y: number; width: number; height: number }) => void;
  onDragEnd?: (mousePos: { x: number; y: number }) => void;
  onDock?: () => void;
}

const FloatingWindow: React.FC<FloatingWindowProps> = ({
  title,
  children,
  initialPosition = { x: 360, y: 110 },
  initialSize = { width: 520, height: 420 },
  onClose,
  minWidth = 420,
  minHeight = 260,
  maxWidth = 'calc(100vw - 24px)',
  maxHeight = 'calc(100vh - 24px)',
  zIndex = 2600,
  className = '',
  onFocusRequest,
  onBoundsChange,
  onDragEnd,
  onDock
}) => {
  const { settings } = useSettings();
  const isGlass = settings.uiAppearance.sidebarStyle === 'glass';
  const accentColor = settings.uiAppearance.accentColor;
  const buttonRadius = ({ rounded: 6, square: 2, minimal: 0 } as Record<string, number>)[settings.uiAppearance.buttonStyle] ?? 6;

  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);
  const [isWindowDragging, setIsWindowDragging] = useState(false);

  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: initialSize.width, height: initialSize.height });

  // Keep stable refs to current position/size for the mousemove handler
  const positionRef = useRef(position);
  const sizeRef = useRef(size);
  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => { sizeRef.current = size; }, [size]);

  // Keep onDragEnd up-to-date in a ref so the stale mousemove/mouseup closure always calls the latest version
  const onDragEndRef = useRef(onDragEnd);
  useEffect(() => { onDragEndRef.current = onDragEnd; }, [onDragEnd]);
  const onBoundsChangeRef = useRef(onBoundsChange);
  useEffect(() => { onBoundsChangeRef.current = onBoundsChange; }, [onBoundsChange]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (isDragging.current) {
        const currentSize = sizeRef.current;
        const maxX = Math.max(8, window.innerWidth - currentSize.width - 8);
        const maxY = Math.max(48, window.innerHeight - 80);
        setPosition({
          x: Math.max(8, Math.min(maxX, event.clientX - dragOffset.current.x)),
          y: Math.max(48, Math.min(maxY, event.clientY - dragOffset.current.y))
        });
      }

      if (isResizing.current) {
        const currentPos = positionRef.current;
        const maxW = Math.max(minWidth, window.innerWidth - currentPos.x - 12);
        const maxH = Math.max(minHeight, window.innerHeight - currentPos.y - 12);
        setSize({
          width: Math.max(minWidth, Math.min(maxW, resizeStart.current.width + event.clientX - resizeStart.current.x)),
          height: Math.max(minHeight, Math.min(maxH, resizeStart.current.height + event.clientY - resizeStart.current.y))
        });
      }
    };

    const handleMouseUp = (event: MouseEvent) => {
      const wasDragging = isDragging.current;
      if (!isDragging.current && !isResizing.current) return;
      isDragging.current = false;
      isResizing.current = false;
      setIsWindowDragging(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = '';
      document.body.classList.remove('cu-launcher-dragging');
      document.body.classList.remove('cu-workspace-dock-available');
      if (onBoundsChangeRef.current) {
        const latestPosition = positionRef.current;
        const latestSize = sizeRef.current;
        onBoundsChangeRef.current({
          x: latestPosition.x,
          y: latestPosition.y,
          width: latestSize.width,
          height: latestSize.height
        });
      }
      if (wasDragging && onDragEndRef.current) {
        onDragEndRef.current({ x: event.clientX, y: event.clientY });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [minWidth, minHeight]);

  const handleDragStart = (event: ReactMouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    isDragging.current = true;
    setIsWindowDragging(true);
    dragOffset.current = {
      x: event.clientX - positionRef.current.x,
      y: event.clientY - positionRef.current.y
    };
    document.body.style.cursor = 'move';
    document.body.style.userSelect = 'none';
    document.body.classList.add('cu-launcher-dragging');
    if (onDock) document.body.classList.add('cu-workspace-dock-available');
  };

  const handleResizeStart = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    isResizing.current = true;
    resizeStart.current = {
      x: event.clientX,
      y: event.clientY,
      width: sizeRef.current.width,
      height: sizeRef.current.height
    };
    document.body.style.cursor = 'nwse-resize';
    document.body.style.userSelect = 'none';
  };

  const containerStyle: CSSProperties = {
    position: 'fixed',
    left: position.x,
    top: position.y,
    width: size.width,
    height: size.height,
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
    zIndex,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: 14,
    background: isGlass ? 'rgba(7, 17, 31, 0.92)' : 'rgba(255, 255, 255, 0.96)',
    color: isGlass ? '#d8e2ef' : '#1f2937',
    border: isGlass ? '1px solid rgba(56, 189, 248, 0.24)' : '1px solid rgba(15, 23, 42, 0.14)',
    boxShadow: isGlass
      ? '0 26px 90px rgba(0, 0, 0, 0.58), inset 0 0 0 1px rgba(255, 255, 255, 0.03)'
      : '0 22px 70px rgba(0, 0, 0, 0.28)',
    backdropFilter: 'blur(16px)'
  };

  const resizeHandleStyle: CSSProperties = {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 18,
    height: 18,
    cursor: 'nwse-resize',
    background: isGlass
      ? 'linear-gradient(135deg, transparent 50%, rgba(56, 189, 248, 0.46) 50%)'
      : 'linear-gradient(135deg, transparent 50%, rgba(15, 23, 42, 0.28) 50%)',
    opacity: 0.9
  };

  return (
    <div
      className={`launcher-category-window${isWindowDragging ? ' is-dragging' : ''}${className ? ` ${className}` : ''}`}
      style={containerStyle}
      onMouseDown={onFocusRequest}
    >
      <div
        className="launcher-window-titlebar"
        onMouseDown={handleDragStart}
        style={{
          borderTop: `3px solid ${accentColor}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1, overflow: 'hidden' }}>
          {title}
        </div>
        {onDock && (
          <button
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDock();
            }}
            title="Dock to workspace panel"
            style={{ padding: '3px 9px', fontSize: '0.7rem', borderRadius: buttonRadius, flexShrink: 0, opacity: 0.82 }}
          >
            ⊣ Dock
          </button>
        )}
        {onClose && (
          <button
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            }}
            title="Close window"
            style={{ padding: '3px 9px', fontSize: '0.75rem', borderRadius: buttonRadius, flexShrink: 0 }}
          >
            ✕
          </button>
        )}
      </div>
      {children}
      <div
        className="launcher-window-resize-handle"
        onMouseDown={handleResizeStart}
        title="Resize window"
        aria-hidden="true"
        style={resizeHandleStyle}
      />
    </div>
  );
};

export default FloatingWindow;
