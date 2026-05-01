import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { GameProvider, useGame } from './context/GameContext';
import { AudioProvider } from './context/AudioContext';
import ChessBoard from './components/board/ChessBoard';
import DynamicMenu from './components/menu/DynamicMenu';
import ViewManager from './components/layout/ViewManager';
import { registerView } from './registry/ViewRegistry';
import HistoryView from './views/HistoryView';
import StatsView from './views/StatsView';
import WelcomeView from './views/WelcomeView';
import ThemeEditorView from './views/ThemeEditorView';
import MultiplayerView from './views/MultiplayerView';
import AnalysisView from './views/AnalysisView';
import ComputerOpponentView from './views/ComputerOpponentView';
import SquaresView from './views/SquaresView';
import PathsView from './views/PathsView';
import LayersView from './views/LayersView';
import AudioView from './views/AudioView';
import SoundEditorView from './views/SoundEditorView';
import MobileMenuSheet from './components/menu/MobileMenuSheet';
import { MENU_SCHEMA } from './config/menuSchema';
import './App.css';

registerView({ id: 'welcome', name: 'Welcome', component: WelcomeView, defaultEnabled: true, position: 'left' });
registerView({ id: 'history', name: 'History', component: HistoryView, defaultEnabled: true, position: 'right' });
registerView({ id: 'stats', name: 'Stats', component: StatsView, defaultEnabled: false, position: 'right' });
registerView({ id: 'theme-editor', name: 'Piece Editor', component: ThemeEditorView, defaultEnabled: false, position: 'right' });
registerView({ id: 'multiplayer', name: 'Multiplayer', component: MultiplayerView, defaultEnabled: false, position: 'right' });
registerView({ id: 'analysis', name: 'Analysis', component: AnalysisView, defaultEnabled: false, position: 'right' });
registerView({ id: 'computer-opponent', name: 'Computer Opponent', component: ComputerOpponentView, defaultEnabled: false, position: 'right' });
registerView({ id: 'squares', name: 'Squares', component: SquaresView, defaultEnabled: false, position: 'right' });
registerView({ id: 'paths', name: 'Paths', component: PathsView, defaultEnabled: false, position: 'right' });
registerView({ id: 'layers', name: 'Layers', component: LayersView, defaultEnabled: false, position: 'right' });
registerView({ id: 'audio', name: 'Audio Settings', component: AudioView, defaultEnabled: false, position: 'right' });

function MainLayout() {
  const { settings, toggleView, setTrainingWheels, setGameMode, setThemeEditorMode } = useSettings();
  const { gameState, multiplayer, sendChatMessage } = useGame();

  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [activeMobileSection, setActiveMobileSection] = useState<string | null>(null);

  const chatFeedRef = useRef<HTMLDivElement>(null);
  const [bottomChatText, setBottomChatText] = useState('');

  const [leftWidth, setLeftWidth] = useState(280);
  const [rightWidth, setRightWidth] = useState(320);
  const isDraggingLeft = useRef(false);
  const isDraggingRight = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth <= 768) return;
      if (isDraggingLeft.current) setLeftWidth(Math.max(200, Math.min(500, e.clientX)));
      if (isDraggingRight.current) setRightWidth(Math.max(250, Math.min(600, window.innerWidth - e.clientX)));
    };
    const handleMouseUp = () => {
      isDraggingLeft.current = false;
      isDraggingRight.current = false;
      document.body.style.cursor = 'default';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    if (chatFeedRef.current) {
      chatFeedRef.current.scrollLeft = chatFeedRef.current.scrollWidth;
    }
  }, [multiplayer.chat]);

  const toggleRightPanel = () => setRightPanelOpen(!rightPanelOpen);
  const activeControlMode = (multiplayer.isConnected || multiplayer.vsComputer)
    ? (multiplayer.playerColor || 'both')
    : 'both';

  const handleMenuAction = (actionId: string) => {
    switch (actionId) {
      case 'toggle-history': toggleView('history'); break;
      case 'toggle-stats': toggleView('stats'); break;
      case 'toggle-analysis': toggleView('analysis'); break;
      case 'toggle-audio': toggleView('audio'); break;
      case 'toggle-sound-editor': toggleView('sound-editor'); break;
      case 'toggle-multiplayer': toggleView('multiplayer'); break;
      case 'toggle-computer':
        if (!settings.activeViews.includes('computer-opponent')) toggleView('computer-opponent');
        break;
      case 'toggle-squares': toggleView('squares'); break;
      case 'toggle-paths': toggleView('paths'); break;
      case 'toggle-layers': toggleView('layers'); break;
      case 'toggle-piece-editor':
        setThemeEditorMode(true);
        if (!settings.activeViews.includes('theme-editor')) toggleView('theme-editor');
        break;
      case 'toggle-wheels': setTrainingWheels(!settings.trainingWheels); break;
      case 'upload-rules': alert('Rule Uploading enabled! Please select your .json rule file.'); break;
      case 'set-mode-standard': setGameMode('standard'); break;
      case 'toggle-welcome': toggleView('welcome'); break;
    }
  };

  const handleBottomChatSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bottomChatText.trim()) return;
    sendChatMessage(bottomChatText);
    setBottomChatText('');
  };

  const status = gameState.isCheckmate
    ? 'Checkmate!'
    : gameState.isDraw
      ? 'Draw'
      : gameState.isCheck
        ? 'Check!'
        : `${gameState.turn === 'w' ? 'White' : 'Black'}'s Turn`;

  const { background, frameLayer } = settings.template;
  const isSoundEditorActive = settings.activeViews.includes('sound-editor');
  const isUnified = multiplayer.isConnected && multiplayer.enforceSharedExp;

  const getLayerImageStyles = (layer: any): CSSProperties => {
    const isCentered = layer.repeat === 'centered';
    const backgroundSize = layer.scale !== 100
      ? `${layer.scale}%`
      : (layer.size === 'auto' ? 'auto' : layer.size || 'cover');

    return {
      position: 'absolute',
      inset: 0,
      backgroundImage: layer.image ? `url(${layer.image})` : 'none',
      backgroundRepeat: isCentered ? 'no-repeat' : (layer.repeat || 'no-repeat'),
      backgroundPosition: isCentered
        ? `calc(50% + ${layer.xOffset || 0}px) calc(50% + ${layer.yOffset || 0}px)`
        : `${layer.xOffset || 0}px ${layer.yOffset || 0}px`,
      backgroundSize,
      opacity: layer.opacity,
      pointerEvents: 'none',
      transition: 'background-position 0.1s, background-size 0.1s, opacity 0.1s'
    };
  };

  const getLayerColorStyles = (layer: any): CSSProperties => ({
    position: 'absolute',
    inset: 0,
    backgroundColor: layer.color,
    pointerEvents: 'none'
  });

  return (
    <div className="App">
      <header className="app-header">
        <h1>Grandmaster Platform</h1>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {multiplayer.isConnected && (
            <div
              style={{
                fontSize: '0.65rem',
                padding: '2px 8px',
                borderRadius: '10px',
                background: isUnified ? '#27ae60' : '#e67e22',
                color: 'white'
              }}
            >
              {isUnified ? '✓ Unified' : '⚠️ Independent'}
            </div>
          )}
          <button
            onClick={toggleRightPanel}
            className="mobile-only-btn"
            style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem' }}
          >
            ☰
          </button>
          <div className="game-status-pill">{status}</div>
        </div>
      </header>

      {activeMobileSection && (
        <MobileMenuSheet
          sectionId={activeMobileSection}
          onClose={() => setActiveMobileSection(null)}
          onAction={handleMenuAction}
        />
      )}

      <div
        className="layout-grid"
        style={{ gridTemplateColumns: `${leftWidth}px 4px 1fr 4px ${rightWidth}px` }}
      >
        <aside className="left-panel mobile-hidden">
          <div className="panel-header">Platform Menu</div>
          <DynamicMenu items={MENU_SCHEMA} onAction={handleMenuAction} />
          <div
            className="welcome-sidebar-container"
            style={{ padding: '20px', borderTop: '1px solid #eee', marginTop: 'auto' }}
          >
            <WelcomeView />
          </div>
        </aside>

        <div
          className="resizer mobile-hidden"
          onMouseDown={() => {
            isDraggingLeft.current = true;
            document.body.style.cursor = 'col-resize';
          }}
        />

        <main className="center-panel" style={{ position: 'relative' }}>
          <div data-layer="background-color" style={{ ...getLayerColorStyles(background), zIndex: 0 }} />
          <div data-layer="background-image" style={{ ...getLayerImageStyles(background), zIndex: 1 }} />

          <div data-layer="frame-image" style={{ ...getLayerImageStyles(frameLayer), zIndex: 3 }} />

          <div
            style={{
              position: 'relative',
              overflow: 'visible',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 4
            }}
          >
            {isSoundEditorActive ? (
              <SoundEditorView />
            ) : (
              <div data-layer="outer-wrapper" style={{ position: 'relative', padding: '40px' }}>
                <div data-layer="board-wrapper" style={{ position: 'relative', zIndex: 2 }}>
                  <ChessBoard
                    orientation={activeControlMode === 'b' ? 'b' : 'w'}
                    controlMode={activeControlMode}
                  />
                </div>
              </div>
            )}
          </div>

          {multiplayer.isConnected && !isSoundEditorActive && (
            <div className="center-chat-bar">
              <div className="chat-feed-row" ref={chatFeedRef}>
                {multiplayer.chat.slice(-10).map((msg, i) => (
                  <div key={i} className="chat-pill-mini">
                    <strong>{msg.sender === 'w' ? 'W' : 'B'}:</strong> {msg.text}
                  </div>
                ))}
              </div>
              <form
                onSubmit={handleBottomChatSend}
                style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
              >
                <input
                  name="chat"
                  value={bottomChatText}
                  onChange={(e) => setBottomChatText(e.target.value)}
                  placeholder="Chat..."
                  style={{
                    background: 'rgba(255,255,255,0.7)',
                    borderRadius: '15px',
                    padding: '3px 12px',
                    fontSize: '0.75rem',
                    width: '120px'
                  }}
                />
                <button type="submit" style={{ background: '#3498db', color: 'white', cursor: 'pointer' }}>
                  Send
                </button>
              </form>
            </div>
          )}
        </main>

        <div
          className="resizer mobile-hidden"
          onMouseDown={() => {
            isDraggingRight.current = true;
            document.body.style.cursor = 'col-resize';
          }}
        />

        <aside className={`right-panel ${rightPanelOpen ? 'open' : ''}`}>
          <div className="panel-header">
            Controls <button onClick={toggleRightPanel} style={{ float: 'right' }}>✕</button>
          </div>
          <div style={{ padding: '15px' }}>
            <ViewManager />
          </div>
        </aside>
      </div>

      <div className="mobile-bottom-nav mobile-only">
        <div className="mobile-nav-item" onClick={() => setActiveMobileSection('appearance')}>🎨 Look</div>
        <div className="mobile-nav-item" onClick={() => setActiveMobileSection('audio-config')}>🎵 Audio</div>
        <div className="mobile-nav-item" onClick={() => setActiveMobileSection('gamemodes')}>♟️ Play</div>
        <div className="mobile-nav-item" onClick={toggleRightPanel}>👁️ View</div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AudioProvider>
      <SettingsProvider>
        <GameProvider>
          <MainLayout />
        </GameProvider>
      </SettingsProvider>
    </AudioProvider>
  );
}

export default App;
