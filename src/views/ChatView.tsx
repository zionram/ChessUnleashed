import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { useSettings } from '../context/SettingsContext';
import ChatSettingsView from './ChatSettingsView';

interface ChatViewProps {
  standalone?: boolean;
  displayOnly?: boolean;
}

type ChatVisualStyle = {
  fontFamily?: string;
  fontSize?: number;
  messageSpacing?: number;
  transparent?: boolean;
  textColor?: string;
  selfTextColor?: string;
  otherTextColor?: string;
  systemTextColor?: string;
  backgroundColor?: string;
  selfBubbleColor?: string;
  otherBubbleColor?: string;
  systemBubbleColor?: string;
  defaultBubbleColor?: string;
  selfBubbleTransparent?: boolean;
  otherBubbleTransparent?: boolean;
  systemBubbleTransparent?: boolean;
  defaultBubbleTransparent?: boolean;
  selfFontFamily?: string;
  otherFontFamily?: string;
  systemFontFamily?: string;
  defaultFontFamily?: string;
  selfBold?: boolean;
  selfItalic?: boolean;
  otherBold?: boolean;
  otherItalic?: boolean;
  systemBold?: boolean;
  systemItalic?: boolean;
  defaultBold?: boolean;
  defaultItalic?: boolean;
};

const ChatView: React.FC<ChatViewProps> = ({ standalone, displayOnly }) => {
  const { multiplayer, sendChatMessage } = useGame();
  const { settings } = useSettings();
  const [chatText, setChatText] = useState('');
  const [activeTab, setActiveTab] = useState<'messages' | 'options'>('messages');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isGlass = settings.uiAppearance.sidebarStyle === 'glass';
  const accent = settings.uiAppearance.accentColor;
  const chatStyle = (settings.chatSettings?.style ?? {}) as ChatVisualStyle;
  const chatMessages = multiplayer.chat ?? [];
  const transparentChat = Boolean(chatStyle.transparent);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleChatSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    sendChatMessage(chatText);
    setChatText('');
  };

  const tabBarStyle: React.CSSProperties = {
    display: displayOnly ? 'none' : 'flex',
    gap: 8,
    padding: standalone ? '8px 10px' : '10px 12px',
    borderBottom: transparentChat ? 'none' : (isGlass ? '1px solid rgba(148, 163, 184, 0.16)' : '1px solid #e5e7eb'),
    background: transparentChat ? 'transparent' : (isGlass ? 'rgba(7, 17, 31, 0.86)' : '#f8fafc')
  };

  const getTabButtonStyle = (tab: 'messages' | 'options'): React.CSSProperties => ({
    border: transparentChat
      ? `1px solid ${tab === activeTab ? accent : 'rgba(148, 163, 184, 0.2)'}`
      : isGlass
        ? `1px solid ${tab === activeTab ? accent : 'rgba(148, 163, 184, 0.24)'}`
        : `1px solid ${tab === activeTab ? accent : '#d1d5db'}`,
    background: tab === activeTab
      ? (transparentChat ? `${accent}aa` : (isGlass ? 'rgba(14, 47, 72, 0.92)' : accent))
      : (transparentChat ? 'rgba(2, 6, 23, 0.18)' : (isGlass ? 'rgba(15, 23, 42, 0.5)' : '#ffffff')),
    color: tab === activeTab ? '#ffffff' : (isGlass || transparentChat ? '#cbd5e1' : '#334155'),
    borderRadius: 999,
    padding: '6px 12px',
    fontSize: '0.78rem',
    fontWeight: 700,
    cursor: 'pointer',
    backdropFilter: transparentChat ? 'blur(4px)' : undefined
  });

  const shellStyle: React.CSSProperties = {
    background: transparentChat ? 'transparent' : (chatStyle.backgroundColor ?? (isGlass ? 'rgba(7, 17, 31, 0.72)' : 'white')),
    borderRadius: transparentChat ? 0 : (standalone ? '0' : '8px'),
    border: transparentChat ? 'none' : (standalone ? 'none' : (isGlass ? `1px solid ${accent}33` : '1px solid #ddd')),
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    color: chatStyle.textColor ?? (isGlass ? '#cbd5e1' : undefined),
    backdropFilter: transparentChat ? undefined : (isGlass ? 'blur(10px)' : undefined),
    boxShadow: transparentChat ? 'none' : (isGlass ? 'inset 0 0 0 1px rgba(255,255,255,0.02)' : undefined)
  };

  const messageAreaStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: transparentChat ? (standalone ? '8px 14px' : '12px 14px') : (standalone ? '8px 14px' : '12px'),
    fontSize: chatStyle.fontSize ? `${chatStyle.fontSize}px` : (standalone ? '0.78rem' : '0.8rem'),
    fontFamily: chatStyle.fontFamily,
    minHeight: standalone ? 48 : undefined,
    background: transparentChat ? 'transparent' : (isGlass ? 'rgba(2, 6, 23, 0.22)' : undefined)
  };

  const composerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'stretch',
    borderTop: transparentChat ? 'none' : (isGlass ? '1px solid rgba(148, 163, 184, 0.16)' : '1px solid #eee'),
    background: transparentChat ? 'transparent' : (isGlass ? 'rgba(7, 17, 31, 0.88)' : undefined),
    minHeight: standalone ? 42 : undefined,
    gap: transparentChat ? 8 : 0,
    padding: transparentChat ? '0 12px 10px' : undefined
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    border: transparentChat ? '1px solid rgba(148, 163, 184, 0.22)' : 'none',
    borderRadius: transparentChat ? 999 : 0,
    padding: standalone ? '0 12px' : '10px',
    fontSize: '0.8rem',
    outline: 'none',
    background: transparentChat ? 'rgba(2, 6, 23, 0.28)' : (isGlass ? 'rgba(2, 6, 23, 0.3)' : undefined),
    color: isGlass || transparentChat ? '#dbeafe' : undefined,
    minWidth: 0,
    backdropFilter: transparentChat ? 'blur(4px)' : undefined
  };

  const sendButtonStyle: React.CSSProperties = {
    padding: standalone ? '0 16px' : '10px 15px',
    background: transparentChat ? `${accent}aa` : (isGlass ? 'rgba(14, 47, 72, 0.95)' : '#2196f3'),
    color: isGlass || transparentChat ? '#e0f2fe' : 'white',
    border: transparentChat ? `1px solid ${accent}55` : (isGlass ? `1px solid ${accent}55` : 'none'),
    borderTop: transparentChat ? undefined : 'none',
    borderRight: transparentChat ? undefined : 'none',
    borderBottom: transparentChat ? undefined : 'none',
    borderRadius: transparentChat ? 999 : 0,
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    minWidth: standalone ? 68 : undefined,
    backdropFilter: transparentChat ? 'blur(4px)' : undefined
  };

  const emptyTextStyle: React.CSSProperties = {
    color: isGlass || transparentChat ? '#7f8da3' : '#aaa',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: standalone ? 4 : '40px'
  };

  const getMessageRole = (sender: string): 'self' | 'other' | 'system' => {
    if (sender === 'w') return 'self';
    if (sender === 'b') return 'other';
    return 'system';
  };

  const getRoleTextColor = (role: 'self' | 'other' | 'system' | 'default') => {
    if (role === 'self') return chatStyle.selfTextColor ?? (isGlass ? '#7dd3fc' : '#1976d2');
    if (role === 'other') return chatStyle.otherTextColor ?? (isGlass ? '#cbd5e1' : '#2c3e50');
    if (role === 'system') return chatStyle.systemTextColor ?? (isGlass ? '#fbbf24' : '#e67e22');
    return chatStyle.textColor ?? (isGlass ? '#d6e2ef' : undefined);
  };

  const getRoleBubbleColor = (role: 'self' | 'other' | 'system' | 'default') => {
    if (role === 'self') return chatStyle.selfBubbleColor;
    if (role === 'other') return chatStyle.otherBubbleColor;
    if (role === 'system') return chatStyle.systemBubbleColor;
    return chatStyle.defaultBubbleColor;
  };

  const getRoleBubbleTransparent = (role: 'self' | 'other' | 'system' | 'default') => {
    if (transparentChat) return true;
    if (role === 'self') return Boolean(chatStyle.selfBubbleTransparent);
    if (role === 'other') return Boolean(chatStyle.otherBubbleTransparent);
    if (role === 'system') return Boolean(chatStyle.systemBubbleTransparent ?? true);
    return Boolean(chatStyle.defaultBubbleTransparent ?? true);
  };

  const getRoleFontFamily = (role: 'self' | 'other' | 'system' | 'default') => {
    if (role === 'self') return chatStyle.selfFontFamily ?? chatStyle.fontFamily;
    if (role === 'other') return chatStyle.otherFontFamily ?? chatStyle.fontFamily;
    if (role === 'system') return chatStyle.systemFontFamily ?? chatStyle.fontFamily;
    return chatStyle.defaultFontFamily ?? chatStyle.fontFamily;
  };

  const getRoleFontWeight = (role: 'self' | 'other' | 'system' | 'default') => {
    if (role === 'self') return chatStyle.selfBold ? 800 : undefined;
    if (role === 'other') return chatStyle.otherBold ? 800 : undefined;
    if (role === 'system') return (chatStyle.systemBold ?? true) ? 800 : undefined;
    return chatStyle.defaultBold ? 800 : undefined;
  };

  const getRoleFontStyle = (role: 'self' | 'other' | 'system' | 'default') => {
    if (role === 'self') return chatStyle.selfItalic ? 'italic' : undefined;
    if (role === 'other') return chatStyle.otherItalic ? 'italic' : undefined;
    if (role === 'system') return chatStyle.systemItalic ? 'italic' : undefined;
    return chatStyle.defaultItalic ? 'italic' : undefined;
  };

  const getSenderColor = (sender: string) => getRoleTextColor(getMessageRole(sender));

  const getMessageStyle = (sender: string): React.CSSProperties => {
    const role = getMessageRole(sender);
    const bubbleTransparent = getRoleBubbleTransparent(role);
    return {
      marginBottom: chatStyle.messageSpacing ?? (standalone ? 4 : 8),
      color: getRoleTextColor(role),
      background: bubbleTransparent ? 'transparent' : getRoleBubbleColor(role),
      padding: bubbleTransparent || !getRoleBubbleColor(role) ? 0 : '7px 9px',
      borderRadius: bubbleTransparent ? 0 : 10,
      textShadow: transparentChat || bubbleTransparent ? '0 1px 4px rgba(0, 0, 0, 0.85)' : undefined,
      fontFamily: getRoleFontFamily(role),
      fontWeight: getRoleFontWeight(role),
      fontStyle: getRoleFontStyle(role)
    };
  };

  return (
    <div
      className={standalone ? 'chat-view chat-view-standalone cu-view-shell' : 'view-container chat-view cu-view-shell'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      <div style={shellStyle}>
        {!displayOnly && (
          <div style={tabBarStyle}>
            <button type="button" style={getTabButtonStyle('messages')} onClick={() => setActiveTab('messages')}>
              Messages
            </button>
            <button type="button" style={getTabButtonStyle('options')} onClick={() => setActiveTab('options')}>
              Options
            </button>
          </div>
        )}

        {displayOnly || activeTab === 'messages' ? (
          <>
            <div style={messageAreaStyle}>
              {chatMessages.length === 0 && (
                <div style={emptyTextStyle}>
                  No messages yet
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} style={getMessageStyle(msg.sender)}>
                  <span style={{ fontWeight: 'bold', color: getSenderColor(msg.sender) }}>
                    {msg.sender === 'w' ? 'White' : msg.sender === 'b' ? 'Black' : 'System'}:
                  </span>{' '}
                  <span style={{ wordBreak: 'break-word' }}>{msg.text}</span>
                  <div style={{ fontSize: '0.65rem', color: transparentChat ? 'rgba(203, 213, 225, 0.76)' : (isGlass ? '#64748b' : '#999'), marginTop: '1px' }}>{msg.time}</div>
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
          </>
        ) : (
          <div style={{ flex: 1, overflow: 'auto', padding: standalone ? '10px' : '12px' }}>
            <ChatSettingsView embedded />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatView;
