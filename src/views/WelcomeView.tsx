import React, { useEffect, useMemo, useState } from 'react';
import { useSettings } from '../context/SettingsContext';

const fallbackMessages = [
  "Tip: Use Let's Play to start a bot, local, or multiplayer game.",
  'Did you know? Knights are the only pieces that can jump.',
  'Try importing custom pieces from Environment -> Look -> Pieces.',
  'Chess fact: Castling is the only move where two pieces move at once.',
  'Tip: Save your favorite setup as an ExperiencePackage.'
];

const WelcomeView: React.FC = () => {
  const { settings, updateUIAppearance } = useSettings();
  const {
    showTipsBoard,
    tipsRotationSeconds,
    tipsMessages,
    welcomePanelColor,
    welcomePanelFrameColor,
    welcomePanelFrameMode,
    accentColor,
    sidebarStyle
  } = settings.uiAppearance;
  const isGlass = sidebarStyle === 'glass';
  const messages = useMemo(
    () => (tipsMessages.length ? tipsMessages : fallbackMessages),
    [tipsMessages]
  );
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!showTipsBoard || messages.length < 2) return;
    const interval = window.setInterval(() => {
      setMessageIndex(current => (current + 1) % messages.length);
    }, Math.max(3, tipsRotationSeconds) * 1000);

    return () => window.clearInterval(interval);
  }, [showTipsBoard, messages.length, tipsRotationSeconds]);

  useEffect(() => {
    if (messageIndex >= messages.length) setMessageIndex(0);
  }, [messageIndex, messages.length]);

  const showPrevious = () => setMessageIndex(current => (current - 1 + messages.length) % messages.length);
  const showNext = () => setMessageIndex(current => (current + 1) % messages.length);

  if (!showTipsBoard) {
    return (
      <div className="view-container cu-view-shell">
        <button
          onClick={() => updateUIAppearance({ showTipsBoard: true })}
          style={{ width: '100%', padding: '8px', fontSize: '0.75rem' }}
        >
          Show Tips Board
        </button>
      </div>
    );
  }

  return (
    <div className="view-container cu-view-shell">
      <div
        style={{
          border: welcomePanelFrameMode === 'none'
            ? '1px solid transparent'
            : `1px solid ${welcomePanelFrameMode === 'accent' ? accentColor : (welcomePanelFrameColor || '#d7e0e7')}`,
          borderRadius: 8,
          background: welcomePanelColor || '#fff',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <strong style={{ fontSize: '0.82rem' }}>Tips / Announcements</strong>
          <button
            onClick={() => updateUIAppearance({ showTipsBoard: false })}
            title="Hide tips board"
            style={{ fontSize: '0.65rem', padding: '2px 6px' }}
          >
            Close
          </button>
        </div>
        <div style={{ fontSize: '0.78rem', color: isGlass ? '#c8d0d9' : '#34495e', lineHeight: 1.35, minHeight: 44 }}>
          {messages[messageIndex]}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <button onClick={showPrevious} disabled={messages.length < 2} style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
            Previous
          </button>
          <span style={{ fontSize: '0.65rem', color: isGlass ? '#7f8da3' : '#7f8c8d' }}>
            {messageIndex + 1} / {messages.length}
          </span>
          <button onClick={showNext} disabled={messages.length < 2} style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeView;
