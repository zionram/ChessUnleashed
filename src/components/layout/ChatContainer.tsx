import React, { useState, useEffect, useRef } from 'react';
import { Settings } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import ChatView from '../../views/ChatView';

interface ChatContainerProps {
  requiredPosition: 'right' | 'bottom' | 'floating';
}

const ChatContainer: React.FC<ChatContainerProps> = ({ requiredPosition }) => {
  const { settings, updateChatSettings, toggleView } = useSettings();
  const { position, lineCount, floatingPos } = settings.chatSettings;
  const chatStyle = settings.chatSettings.style || {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 13,
    messageSpacing: 8
  };
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPosition, setDragPosition] = useState(floatingPos || { x: 100, y: 100 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (floatingPos && !isDragging) setDragPosition(floatingPos);
  }, [floatingPos, isDragging]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setDragPosition({
        x: Math.max(0, e.clientX - dragOffset.x),
        y: Math.max(0, e.clientY - dragOffset.y)
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false);
      
      const x = e.clientX - dragOffset.x;
      const y = e.clientY - dragOffset.y;
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Snapping logic
      if (x > w - 350) {
        updateChatSettings({ position: 'right' });
      } else if (y > h - 150) {
        updateChatSettings({ position: 'bottom' });
      } else {
        updateChatSettings({ 
          position: 'floating', 
          floatingPos: { x: Math.max(0, x), y: Math.max(0, y) }
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, updateChatSettings]);

  if (position !== requiredPosition) {
    return null;
  }

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    // Only drag on left click and not on interactive elements
    if (e.button !== 0) return;
    e.preventDefault();

    setIsDragging(true);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const lineHeight = 20; 
  const height = Math.max(60, lineCount * lineHeight + 40); 
  const chatContentStyles: React.CSSProperties & {
    '--chat-font-family': string;
    '--chat-font-size': string;
    '--chat-message-spacing': string;
  } = {
    '--chat-font-family': chatStyle.fontFamily,
    '--chat-font-size': `${chatStyle.fontSize}px`,
    '--chat-message-spacing': `${chatStyle.messageSpacing}px`,
    height: '100%',
    minHeight: 0,
    overflow: 'hidden'
  };

  const baseStyles: React.CSSProperties = {
    background: '#fff',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: position === 'floating' ? '0 4px 15px rgba(0,0,0,0.2)' : 'none',
    border: '1px solid #ddd',
    zIndex: 100
  };

  const dragStyles: React.CSSProperties = isDragging ? {
    position: 'fixed',
    left: dragPosition.x,
    top: dragPosition.y,
    width: containerRef.current?.getBoundingClientRect().width || (position === 'bottom' ? 420 : 300),
    height: containerRef.current?.getBoundingClientRect().height || `${height + 40}px`,
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
    borderRadius: '8px',
    zIndex: 1000
  } : {};

  const dragHeader = (
    <div
      onMouseDown={handleHeaderMouseDown}
      style={{
        padding: '4px',
        background: '#f0f0f0',
        fontSize: '0.6rem',
        textAlign: 'center',
        color: '#999',
        borderBottom: '1px solid #ddd',
        userSelect: 'none',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
    >
      DRAG TO MOVE / SNAP
    </div>
  );

  const openChatSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!settings.activeViews.includes('chat-settings')) toggleView('chat-settings');
  };

  const settingsButton = (
    <button
      onClick={openChatSettings}
      onMouseDown={(e) => e.stopPropagation()}
      title="Chat settings"
      style={{
        position: 'absolute',
        top: position === 'bottom' ? 8 : 6,
        right: 8,
        zIndex: 2,
        width: 26,
        height: 26,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid #d0d7de',
        borderRadius: position === 'bottom' ? '6px 0 0 6px' : 6,
        background: '#fff',
        color: '#2c3e50',
        cursor: 'pointer'
      }}
    >
      <Settings size={14} />
    </button>
  );

  const renderChatView = (standalone?: boolean) => (
    <div className="chat-container-styled" style={chatContentStyles}>
      <style>
        {`
          .chat-container-styled,
          .chat-container-styled * {
            font-family: var(--chat-font-family) !important;
            font-size: var(--chat-font-size) !important;
          }

          .chat-container-styled > div > div > div:first-child > div:not(:last-child) {
            margin-bottom: var(--chat-message-spacing) !important;
          }
        `}
      </style>
      <ChatView standalone={standalone} />
    </div>
  );

  if (position === 'right') {
    return (
      <div ref={containerRef} style={{ ...baseStyles, height: '100%', border: 'none', ...dragStyles }}>
        {dragHeader}
        {settingsButton}
        {renderChatView()}
      </div>
    );
  }

  if (position === 'bottom') {
    return (
      <div ref={containerRef} style={{ 
        ...baseStyles, 
        width: '100%', 
        height: `${height}px`, 
        maxHeight: '200px',
        borderLeft: 'none',
        borderRight: 'none',
        borderBottom: 'none',
        ...dragStyles
      }}>
        {dragHeader}
        {settingsButton}
        {renderChatView(true)}
      </div>
    );
  }

  // Floating mode
  return (
    <div ref={containerRef} style={{ 
      ...baseStyles, 
      position: 'fixed',
      left: isDragging ? dragPosition.x : floatingPos?.x || 100,
      top: isDragging ? dragPosition.y : floatingPos?.y || 100,
      width: '300px',
      height: `${height + 40}px`,
      borderRadius: '8px'
    }}>
      {dragHeader}
      {settingsButton}
      {renderChatView(true)}
    </div>
  );
};

export default ChatContainer;
