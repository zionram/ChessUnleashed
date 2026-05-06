import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSettings } from '../../context/SettingsContext';

interface OverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseAttempt?: () => void;
  title: string;
  children: React.ReactNode;
}

const normalizeTitleText = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

const Overlay: React.FC<OverlayProps> = ({ isOpen, onClose, onCloseAttempt, title, children }) => {
  const { settings } = useSettings();
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) setPos({ x: 0, y: 0 });
  }, [isOpen]);

  useEffect(() => {
    if (!import.meta.env.DEV || !isOpen) return;
    const firstHeading = bodyRef.current?.querySelector('h1, h2, h3, h4');
    const headingText = firstHeading?.textContent ?? '';
    if (headingText && normalizeTitleText(headingText) === normalizeTitleText(title)) {
      console.warn(
        `[Panel title ownership] "${title}" is already rendered by the overlay shell. Remove the duplicate top-level heading from the view component.`
      );
    }
  }, [isOpen, title]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    offset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    };
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      let newX = e.clientX - offset.current.x;
      let newY = e.clientY - offset.current.y;
      const padding = 50;
      newX = Math.max(-window.innerWidth/2 + padding, Math.min(window.innerWidth/2 - padding, newX));
      newY = Math.max(-window.innerHeight/2 + padding, Math.min(window.innerHeight/2 - padding, newY));
      setPos({ x: newX, y: newY });
    };

    const onMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  const handleClose = () => {
    if (onCloseAttempt) {
      onCloseAttempt();
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const isGlass = settings.uiAppearance.sidebarStyle === 'glass';

  return createPortal(
    <div
      className="overlay-backdrop"
      data-sidebar-style={settings.uiAppearance.sidebarStyle}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: isGlass
          ? `rgba(0, 0, 0, ${Math.max(settings.uiAppearance.overlayBackdropOpacity / 100, 0.62)})`
          : `rgba(0, 0, 0, ${settings.uiAppearance.overlayBackdropOpacity / 100})`,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 6000,
        padding: '18px',
        boxSizing: 'border-box'
      }}
      onClick={onCloseAttempt ? undefined : handleClose}
    >
      <div
        ref={modalRef}
        className="overlay-content"
        style={{
          backgroundColor: isGlass ? 'rgba(7, 17, 31, 0.94)' : 'rgba(255, 255, 255, 0.85)',
          color: isGlass ? '#dbeafe' : '#2c3e50',
          backdropFilter: `blur(${settings.uiAppearance.overlayContentBlur}px)`,
          padding: '25px',
          borderRadius: '12px',
          width: 'min(92vw, 840px)',
          maxHeight: 'min(90vh, 820px)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isGlass
            ? '0 24px 80px rgba(0, 0, 0, 0.62), inset 0 0 0 1px rgba(255, 255, 255, 0.03)'
            : '0 8px 32px rgba(0, 0, 0, 0.1)',
          border: isGlass ? '1px solid rgba(56, 189, 248, 0.22)' : '1px solid rgba(255, 255, 255, 0.3)',
          overflow: 'hidden',
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          onMouseDown={onMouseDown}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px',
            borderBottom: isGlass ? '1px solid rgba(148, 163, 184, 0.16)' : '1px solid #ccc',
            paddingBottom: '10px',
            flexShrink: 0,
            cursor: 'move',
            userSelect: 'none'
          }}
        >
          <h3 style={{ margin: 0, color: isGlass ? '#e2e8f0' : '#2c3e50', pointerEvents: 'none' }}>{title}</h3>
          <button
            onClick={handleClose}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              background: isGlass ? 'rgba(15, 23, 42, 0.72)' : 'none',
              border: isGlass ? '1px solid rgba(148, 163, 184, 0.20)' : 'none',
              borderRadius: 6,
              width: 32,
              height: 30,
              display: 'inline-grid',
              placeItems: 'center',
              fontSize: '1.35rem',
              lineHeight: 1,
              cursor: 'pointer',
              color: isGlass ? '#dbeafe' : '#666'
            }}
          >
            ×
          </button>
        </div>
        <div
          ref={bodyRef}
          className="overlay-body"
          style={{
            overflowY: 'auto',
            flex: 1,
            paddingRight: '5px',
            color: isGlass ? '#cbd5e1' : undefined
          }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Overlay;
