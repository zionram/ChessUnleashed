import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';

interface ChatViewProps {
  standalone?: boolean;
}

const ChatView: React.FC<ChatViewProps> = ({ standalone }) => {
  const { multiplayer, sendChatMessage } = useGame();
  const [chatText, setChatText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className={standalone ? "" : "view-container"} style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      overflow: 'hidden'
    }}>
      <div style={{ 
        background: 'white', 
        borderRadius: standalone ? '0' : '8px', 
        border: standalone ? 'none' : '1px solid #ddd', 
        overflow: 'hidden', 
        display: 'flex', 
        flexDirection: 'column', 
        flex: 1 
      }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px', fontSize: '0.8rem' }}>
          {multiplayer.chat.length === 0 && (
            <div style={{ color: '#aaa', fontStyle: 'italic', textAlign: 'center', marginTop: '40px' }}>
              No messages yet
            </div>
          )}
          {multiplayer.chat.map((msg, i) => (
            <div key={i} style={{ marginBottom: '8px' }}>
              <span style={{ fontWeight: 'bold', color: msg.sender === 'w' ? '#1976d2' : msg.sender === 'b' ? '#2c3e50' : '#e67e22' }}>
                {msg.sender === 'w' ? 'White' : msg.sender === 'b' ? 'Black' : 'System'}:
              </span> <span style={{ wordBreak: 'break-word' }}>{msg.text}</span>
              <div style={{ fontSize: '0.65rem', color: '#999', marginTop: '1px' }}>{msg.time}</div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={handleChatSend} style={{ display: 'flex', borderTop: '1px solid #eee' }}>
          <input 
            value={chatText} 
            onChange={(e) => setChatText(e.target.value)} 
            placeholder="Type a message..." 
            style={{ flex: 1, border: 'none', padding: '10px', fontSize: '0.8rem', outline: 'none' }}
          />
          <button type="submit" style={{ padding: '10px 15px', background: '#2196f3', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatView;
