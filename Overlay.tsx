import React, { useState, useRef, useEffect } from 'react';
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

  return (
    <div 
      className="overlay-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: `rgba(0, 0, 0, ${settings.uiAppearance.overlayBackdropOpacity / 100})`,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
      onClick={onCloseAttempt ? undefined : handleClose}
    >
      <div
        ref={modalRef}
        className="overlay-content"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: `blur(${settings.uiAppearance.overlayContentBlur}px)`,
          padding: '25px',
          borderRadius: '12px',
          width: 'min(90vw, 450px)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
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
            borderBottom: '1px solid #ccc', 
            paddingBottom: '10px', 
            flexShrink: 0,
            cursor: 'move',
            userSelect: 'none'
          }}
        >
          <h3 style={{ margin: 0, color: '#2c3e50', pointerEvents: 'none' }}>{title}</h3>
          <button 
            onClick={handleClose}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>
        <div ref={bodyRef} style={{ overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Overlay;
