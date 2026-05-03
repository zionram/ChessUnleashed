import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { useSettings } from '../context/SettingsContext';

interface ChatViewProps {
  standalone?: boolean;
}

const ChatView: React.FC<ChatViewProps> = ({ standalone }) => {
  const { multiplayer, sendChatMessage } = useGame();
  const { settings } = useSettings();
  const [chatText, setChatText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isGlass = settings.uiAppearance.sidebarStyle === 'glass';
  const accent = settings.uiAppearance.accentColor;

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [multiplayer.chat]);

  const handleChatSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    sendChatMessage(chatText);
    setChatText('');
  };

  const shellStyle: React.CSSProperties = {
    background: isGlass ? 'rgba(7, 17, 31, 0.72)' : 'white',
    borderRadius: standalone ? '0' : '8px',
    border: standalone ? 'none' : (isGlass ? `1px solid ${accent}33` : '1px solid #ddd'),
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    color: isGlass ? '#cbd5e1' : undefined,
    backdropFilter: isGlass ? 'blur(10px)' : undefined,
    boxShadow: isGlass ? 'inset 0 0 0 1px rgba(255,255,255,0.02)' : undefined
  };

  const messageAreaStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: standalone ? '8px 14px' : '12px',
    fontSize: standalone ? '0.78rem' : '0.8rem',
    minHeight: standalone ? 48 : undefined,
    background: isGlass ? 'rgba(2, 6, 23, 0.22)' : undefined
  };

  const composerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'stretch',
    borderTop: isGlass ? '1px solid rgba(148, 163, 184, 0.16)' : '1px solid #eee',
    background: isGlass ? 'rgba(7, 17, 31, 0.88)' : undefined,
    minHeight: standalone ? 42 : undefined
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    border: 'none',
    padding: standalone ? '0 12px' : '10px',
    fontSize: '0.8rem',
    outline: 'none',
    background: isGlass ? 'rgba(2, 6, 23, 0.3)' : undefined,
    color: isGlass ? '#dbeafe' : undefined,
    minWidth: 0
  };

  const sendButtonStyle: React.CSSProperties = {
    padding: standalone ? '0 16px' : '10px 15px',
    background: isGlass ? 'rgba(14, 47, 72, 0.95)' : '#2196f3',
    color: isGlass ? '#e0f2fe' : 'white',
    border: isGlass ? `1px solid ${accent}55` : 'none',
    borderTop: 'none',
    borderRight: 'none',
    borderBottom: 'none',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    minWidth: standalone ? 68 : undefined
  };

  const emptyTextStyle: React.CSSProperties = {
    color: isGlass ? '#7f8da3' : '#aaa',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: standalone ? 4 : '40px'
  };

  return (
    <div
      className={standalone ? "chat-view chat-view-standalone" : "view-container chat-view"}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      <div style={shellStyle}>
        <div style={messageAreaStyle}>
          {multiplayer.chat.length === 0 && (
            <div style={emptyTextStyle}>
              No messages yet
            </div>
          )}
          {multiplayer.chat.map((msg, i) => (
            <div key={i} style={{ marginBottom: standalone ? '4px' : '8px' }}>
              <span
                style={{
                  fontWeight: 'bold',
                  color: msg.sender === 'w'
                    ? (isGlass ? '#7dd3fc' : '#1976d2')
                    : msg.sender === 'b'
                      ? (isGlass ? '#cbd5e1' : '#2c3e50')
                      : (isGlass ? '#fbbf24' : '#e67e22')
                }}
              >
                {msg.sender === 'w' ? 'White' : msg.sender === 'b' ? 'Black' : 'System'}:
              </span>{' '}
              <span style={{ wordBreak: 'break-word', color: isGlass ? '#d6e2ef' : undefined }}>{msg.text}</span>
              <div style={{ fontSize: '0.65rem', color: isGlass ? '#64748b' : '#999', marginTop: '1px' }}>{msg.time}</div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={handleChatSend} style={composerStyle}>
          <input
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            placeholder="Type a message..."
            style={inputStyle}
          />
          <button type="submit" style={sendButtonStyle}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatView;
