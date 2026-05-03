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
import EventLogView from './views/EventLogView';
import EventBuilderView from './views/EventBuilderView';
import TroubleshooterView from './views/TroubleshooterView';
import ChatSettingsView from './views/ChatSettingsView';
import BotsView from './views/BotsView';
import TimerSettingsView from './views/TimerSettingsView';
import TimerView from './views/TimerView';
import PlatformAppearanceView from './views/PlatformAppearanceView';
import AnimationSettingsView from './views/AnimationSettingsView';
import AnimationBuilderView from './views/AnimationBuilderView';
import AboutSupportView from './views/AboutSupportView';
import ProfileView from './views/ProfileView';
import RuleBuilderView from './views/RuleBuilderView';
import CustomGameRuntimeView from './views/CustomGameRuntimeView';
import LetsPlaySetupView from './views/LetsPlaySetupView';
import ChatContainer from './components/layout/ChatContainer';
import AudioController from './components/layout/AudioController';
import GameEndOverlay from './components/layout/GameEndOverlay';
import Overlay from './components/layout/Overlay';
import MobileMenuSheet from './components/menu/MobileMenuSheet';
import ImportExportView from './views/ImportExportView';
import { MENU_SCHEMA, type MenuItem } from './config/menuSchema';
import { clearErrorLogEntries, installGlobalErrorLogging } from './utils/ErrorLog';
import { SETTINGS_STORAGE_KEY } from './context/SettingsContext';
import { clearGameSnapshot, readGameSnapshot } from './runtime/GameSnapshot';
import './App.css';

const ChatRight = () => {
  const { settings } = useSettings();
  if (settings.chatSettings.position !== 'right') return null;
  return <ChatContainer requiredPosition="right" />;
};

const TimerRight = () => {
  const { settings } = useSettings();
  if (!settings.timeControl.enabled || settings.timeControl.placement !== 'right-panel') return null;
  return <TimerView />;
};

registerView({ id: 'welcome', name: 'Welcome', component: WelcomeView, defaultEnabled: true, position: 'left' });
registerView({ id: 'history', name: 'History', component: HistoryView, defaultEnabled: true, position: 'right' });
registerView({ id: 'chat', name: 'Chat', component: ChatRight, defaultEnabled: false, position: 'right' });
registerView({ id: 'chat-settings', name: 'Chat Settings', component: ChatSettingsView, defaultEnabled: false, position: 'right' });
registerView({ id: 'bots', name: 'Bots Management', component: BotsView, defaultEnabled: false, position: 'right' });
registerView({ id: 'profile', name: 'Profile', component: ProfileView, defaultEnabled: false, position: 'right' });
registerView({ id: 'rule-builder', name: 'Rule Builder', component: RuleBuilderView, defaultEnabled: false, position: 'right' });
registerView({ id: 'timer', name: 'Timer', component: TimerRight, defaultEnabled: false, position: 'right' });
registerView({ id: 'timer-settings', name: 'Timer Settings', component: TimerSettingsView, defaultEnabled: false, position: 'right' });
registerView({ id: 'event-log', name: 'Event Log', component: EventLogView, defaultEnabled: false, position: 'right' });
registerView({ id: 'event-builder', name: 'Event Builder', component: EventBuilderView, defaultEnabled: false, position: 'center' });
registerView({ id: 'troubleshooter', name: 'Troubleshooter', component: TroubleshooterView, defaultEnabled: false, position: 'right' });
registerView({ id: 'stats', name: 'Stats', component: StatsView, defaultEnabled: false, position: 'right' });
registerView({ id: 'theme-editor', name: 'Piece Editor', component: ThemeEditorView, defaultEnabled: false, position: 'right' });
registerView({ id: 'multiplayer', name: 'Multiplayer', component: MultiplayerView, defaultEnabled: false, position: 'right' });
registerView({ id: 'analysis', name: 'Analysis', component: AnalysisView, defaultEnabled: false, position: 'right' });
registerView({ id: 'computer-opponent', name: 'Computer Opponent', component: ComputerOpponentView, defaultEnabled: false, position: 'right' });
registerView({ id: 'squares', name: 'Squares', component: SquaresView, defaultEnabled: false, position: 'right' });
registerView({ id: 'paths', name: 'Paths', component: PathsView, defaultEnabled: false, position: 'right' });
registerView({ id: 'layers', name: 'Layers', component: LayersView, defaultEnabled: false, position: 'right' });
registerView({ id: 'audio', name: 'Audio Settings', component: AudioView, defaultEnabled: false, position: 'right' });
registerView({ id: 'platform-appearance', name: 'Platform UI', component: PlatformAppearanceView, defaultEnabled: false, position: 'right' });
registerView({ id: 'animation-settings', name: 'Animation', component: AnimationSettingsView, defaultEnabled: false, position: 'right' });
registerView({ id: 'animation-builder', name: 'Animation Builder', component: AnimationBuilderView, defaultEnabled: false, position: 'center' });
registerView({ id: 'about-support', name: 'About / Support', component: AboutSupportView, defaultEnabled: false, position: 'right' });

function MainLayout() {
  const { settings, toggleView, setTrainingWheels, setGameMode, setThemeEditorMode, updateTimeControl } = useSettings();
  const { gameState, multiplayer, timeoutResult, resignationResult, resetGame, resignGame } = useGame();
  const { localProfile } = settings;

  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [activeMobileSection, setActiveMobileSection] = useState<string | null>(null);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [resetConfirmationOpen, setResetConfirmationOpen] = useState(false);
  const [newGameOverlayOpen, setNewGameOverlayOpen] = useState(false);
  const [packageManagerOpen, setPackageManagerOpen] = useState(false);
  const [activeCustomRulesetId, setActiveCustomRulesetId] = useState<string | null>(() => {
    const snapshot = readGameSnapshot();
    return snapshot?.gameType === 'custom' ? snapshot.selectedCustomRulesetId : null;
  });

  const [activeLauncherItem, setActiveLauncherItem] = useState<MenuItem | null>(null);
  const [leftWidth, setLeftWidth] = useState(280);
  const [rightWidth, setRightWidth] = useState(320);
  const [dismissedGameEndOverlay, setDismissedGameEndOverlay] = useState(false);
  const isDraggingLeft = useRef(false);
  const isDraggingRight = useRef(false);
  const timerDragBounds = useRef<HTMLDivElement | null>(null);
  const draggableTimerRef = useRef<HTMLDivElement | null>(null);
  const centerPanelRef = useRef<HTMLElement | null>(null);
  const boardWrapperRef = useRef<HTMLDivElement | null>(null);
  const timerDragOffset = useRef({ x: 0, y: 0 });
  const [isTimerDragging, setIsTimerDragging] = useState(false);
  const [frameAnchor, setFrameAnchor] = useState({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    installGlobalErrorLogging();
  }, []);

  useEffect(() => {
    const startCustomGame = (event: Event) => {
      const rulesetId = (event as CustomEvent<{ rulesetId?: string }>).detail?.rulesetId;
      if (rulesetId) setActiveCustomRulesetId(rulesetId);
    };
    const endCustomGame = () => {
      clearGameSnapshot();
      setActiveCustomRulesetId(null);
    };
    window.addEventListener('chess-unleashed-start-custom-game', startCustomGame);
    window.addEventListener('chess-unleashed-end-custom-game', endCustomGame);
    return () => {
      window.removeEventListener('chess-unleashed-start-custom-game', startCustomGame);
      window.removeEventListener('chess-unleashed-end-custom-game', endCustomGame);
    };
  }, []);

  useEffect(() => {
    if (activeCustomRulesetId && !settings.customRulesets.some(ruleset => ruleset.id === activeCustomRulesetId)) {
      clearGameSnapshot();
      setActiveCustomRulesetId(null);
    }
  }, [activeCustomRulesetId, settings.customRulesets]);

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
    if (!isTimerDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const bounds = timerDragBounds.current?.getBoundingClientRect();
      const timerRect = draggableTimerRef.current?.getBoundingClientRect();
      if (!bounds) return;

      const timerWidth = timerRect?.width ?? 180;
      const timerHeight = timerRect?.height ?? 80;
      const x = Math.max(0, Math.min(bounds.width - timerWidth, e.clientX - bounds.left - timerDragOffset.current.x));
      const y = Math.max(0, Math.min(bounds.height - timerHeight, e.clientY - bounds.top - timerDragOffset.current.y));

      updateTimeControl({ draggablePosition: { x, y } });
    };

    const handleMouseUp = () => {
      setIsTimerDragging(false);
      document.body.style.cursor = 'default';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isTimerDragging, updateTimeControl]);

  useEffect(() => {
    if (!timeoutResult && !resignationResult && !gameState.isCheckmate && !gameState.isDraw) {
      setDismissedGameEndOverlay(false);
    }
  }, [timeoutResult, resignationResult, gameState.isCheckmate, gameState.isDraw]);

  const toggleRightPanel = () => {
    if (window.innerWidth > 768) {
      setRightPanelCollapsed(current => !current);
      return;
    }

    const nextOpen = !rightPanelOpen;
    setRightPanelOpen(nextOpen);
    if (nextOpen) setRightPanelCollapsed(false);
  };

  const getPlayerName = (color: 'w' | 'b') => {
    if (multiplayer.vsComputer) {
      if (color === multiplayer.computerSide) return multiplayer.opponentProfile.name;
      return localProfile.displayName || 'Guest Player';
    }
    if (multiplayer.isConnected) {
      if (color === multiplayer.playerColor) return localProfile.displayName || 'Guest Player';
      return color === 'w' ? 'White' : 'Black'; // Fallback for multiplayer opponent for now
    }
    // Local play
    if (color === 'w') return localProfile.displayName || 'Guest Player';
    return 'Local Player';
  };

  const activeControlMode = (multiplayer.isConnected || multiplayer.vsComputer)
    ? (multiplayer.playerColor || 'both')
    : 'both';

  const handleMenuAction = (actionId: string) => {
    switch (actionId) {
      case 'toggle-history': toggleView('history'); break;
      case 'toggle-chat': toggleView('chat'); break;
      case 'toggle-chat-settings': toggleView('chat-settings'); break;
      case 'toggle-bots': toggleView('bots'); break;
      case 'toggle-profile': toggleView('profile'); break;
      case 'toggle-rule-builder': toggleView('rule-builder'); break;
      case 'toggle-timer': toggleView('timer'); break;
      case 'toggle-timer-settings': toggleView('timer-settings'); break;
      case 'toggle-stats': toggleView('stats'); break;
      case 'toggle-analysis': toggleView('analysis'); break;
      case 'toggle-event-log': toggleView('event-log'); break;
      case 'toggle-event-builder': toggleView('event-builder'); break;
      case 'toggle-troubleshooter': toggleView('troubleshooter'); break;
      case 'toggle-audio': toggleView('audio'); break;
      case 'toggle-platform-appearance': toggleView('platform-appearance'); break;
      case 'toggle-animation-settings': toggleView('animation-settings'); break;
      case 'toggle-animation-builder': toggleView('animation-builder'); break;
      case 'toggle-about-support': toggleView('about-support'); break;
      case 'toggle-sound-editor': toggleView('sound-editor'); break;
      case 'toggle-multiplayer': toggleView('multiplayer'); break;
      case 'toggle-computer': toggleView('computer-opponent'); break;
      case 'toggle-squares': toggleView('squares'); break;
      case 'toggle-paths': toggleView('paths'); break;
      case 'toggle-layers': toggleView('layers'); break;
      case 'toggle-piece-editor':
        setThemeEditorMode(true);
        if (!settings.activeViews.includes('theme-editor')) toggleView('theme-editor');
        break;
      case 'toggle-wheels': setTrainingWheels(!settings.trainingWheels); break;
      case 'reset-system': setResetConfirmationOpen(true); break;
      case 'upload-rules': alert('Rule Uploading enabled! Please select your .json rule file.'); break;
      case 'set-mode-standard': setGameMode('standard'); break;
      case 'toggle-welcome': toggleView('welcome'); break;
    }
  };

  const status = resignationResult
    ? `${getPlayerName(resignationResult.winner)} wins by resignation`
    : timeoutResult
    ? `${getPlayerName(timeoutResult.winner)} wins on time`
    : gameState.isCheckmate
      ? `${getPlayerName(gameState.turn === 'w' ? 'b' : 'w')} wins by checkmate!`
      : gameState.isDraw
        ? 'Draw'
        : gameState.isCheck
          ? `Check! (${getPlayerName(gameState.turn)})`
          : `${getPlayerName(gameState.turn)}'s Turn`;
  const activeCustomRuleset = settings.customRulesets.find(ruleset => ruleset.id === activeCustomRulesetId) ?? null;
  const displayStatus = activeCustomRuleset ? `Custom Game: ${activeCustomRuleset.name}` : status;
  const isTerminalGame = !!timeoutResult || !!resignationResult || gameState.isCheckmate || gameState.isDraw;
  const showGameEndOverlay = isTerminalGame && !dismissedGameEndOverlay;
  const handleNewGame = () => {
    setDismissedGameEndOverlay(true);
    setNewGameOverlayOpen(true);
  };

  const activeTemplate = settings.themeDraft ?? settings.template;
  const { background, frameLayer } = activeTemplate;
  const isSoundEditorActive = settings.activeViews.includes('sound-editor');
  const isEventBuilderActive = settings.activeViews.includes('event-builder');
  const isAnimationBuilderActive = settings.activeViews.includes('animation-builder');
  const isUnified = multiplayer.isConnected && multiplayer.enforceSharedExp;
  const timerPlacement = settings.timeControl.placement;
  const showBoardTimer = settings.timeControl.enabled && timerPlacement !== 'right-panel';
  const isDraggableTimer = showBoardTimer && settings.timeControl.behavior === 'draggable';
  const draggableTimerPosition = settings.timeControl.draggablePosition ?? { x: 24, y: 24 };
  const densitySpacing = {
    compact: 10,
    comfortable: 15,
    spacious: 20
  }[settings.uiAppearance.density];

  useEffect(() => {
    const updateFrameAnchor = () => {
      const centerRect = centerPanelRef.current?.getBoundingClientRect();
      const boardRect = boardWrapperRef.current?.getBoundingClientRect();
      if (!centerRect || !boardRect) return;

        const sizeMode = frameLayer.frameSizeMode ?? (frameLayer.lockToBoard ? 'match-board' : 'responsive');
        setFrameAnchor({
          x: boardRect.left - centerRect.left + boardRect.width / 2,
          y: boardRect.top - centerRect.top + boardRect.height / 2,
          width: sizeMode === 'match-board'
            ? boardRect.width
            : sizeMode === 'fixed'
              ? (frameLayer.fixedWidth || boardRect.width)
              : centerRect.width,
          height: sizeMode === 'match-board'
            ? boardRect.height
            : sizeMode === 'fixed'
              ? (frameLayer.fixedHeight || boardRect.height)
              : centerRect.height
        });
    };

    updateFrameAnchor();
    window.addEventListener('resize', updateFrameAnchor);
    const observer = new ResizeObserver(updateFrameAnchor);
    if (centerPanelRef.current) observer.observe(centerPanelRef.current);
    if (boardWrapperRef.current) observer.observe(boardWrapperRef.current);

    return () => {
      window.removeEventListener('resize', updateFrameAnchor);
      observer.disconnect();
    };
  }, [leftPanelCollapsed, rightPanelCollapsed, leftWidth, rightWidth, showBoardTimer, timerPlacement, isSoundEditorActive, frameLayer.lockToBoard, frameLayer.frameSizeMode, frameLayer.fixedWidth, frameLayer.fixedHeight]);

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

  const getFrameLayerImageStyles = (layer: any): CSSProperties => ({
    ...getLayerImageStyles(layer),
    inset: 'auto',
    left: frameAnchor.x,
    top: frameAnchor.y,
    width: frameAnchor.width || '100%',
    height: frameAnchor.height || '100%',
    transform: 'translate(-50%, -50%)'
  });

  const getLayerColorStyles = (layer: any): CSSProperties => ({
    position: 'absolute',
    inset: 0,
    backgroundColor: layer.color,
    pointerEvents: 'none'
  });

  const hexToRgba = (hex: string, alpha: number): string => {
    if (!hex.startsWith('#') || hex.length !== 7) return `rgba(255, 255, 255, ${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const getSidePanelStyles = (): CSSProperties => {
    const { sidebarStyle, panelOpacity, panelBackdropBlur, accentColor, panelBackgroundColor } = settings.uiAppearance;
    if (sidebarStyle === 'glass') {
      return {
        backgroundColor: hexToRgba(panelBackgroundColor || '#ffffff', panelOpacity / 100),
        ...(panelBackdropBlur > 0 ? { backdropFilter: `blur(${panelBackdropBlur}px)` } : {})
      };
    }
    if (sidebarStyle === 'bordered') {
      return { border: `2px solid ${accentColor}` };
    }
    return {};
  };

  const getButtonRadius = (): number => ({ rounded: 6, square: 2, minimal: 0 }[settings.uiAppearance.buttonStyle]);

  const isGlassWorkspace = settings.uiAppearance.sidebarStyle === 'glass';
  const glassPanelBg = isGlassWorkspace
    ? hexToRgba(settings.uiAppearance.panelBackgroundColor || '#ffffff', settings.uiAppearance.panelOpacity / 100)
    : '';

  const getWelcomeContainerStyles = (): CSSProperties => {
    const mode = settings.uiAppearance.welcomeSidebarContainerFrameMode;
    const frameColor = mode === 'none'
      ? 'transparent'
      : mode === 'accent'
        ? settings.uiAppearance.accentColor
        : settings.uiAppearance.welcomeSidebarContainerFrameColor || '#eee8d5';
    return {
      padding: '20px',
      marginTop: 'auto',
      background: settings.uiAppearance.welcomeSidebarContainerColor || 'transparent',
      borderTop: `1px solid ${frameColor}`
    };
  };

  return (
    <div
      className="App"
      data-sidebar-style={settings.uiAppearance.sidebarStyle}
      data-density={settings.uiAppearance.density}
      style={{
        fontSize: `${settings.uiAppearance.baseFontSize}px`,
        fontFamily: settings.uiAppearance.fontFamily,
        backgroundColor: settings.uiAppearance.appBackgroundColor,
        '--cu-accent': settings.uiAppearance.accentColor,
        '--cu-btn-radius': `${getButtonRadius()}px`,
        '--cu-glass-panel-bg': glassPanelBg,
      } as CSSProperties}
    >
      <header className="app-header" style={{ backgroundColor: settings.uiAppearance.toolbarBackgroundColor }}>
        <div className="topbar-left">
          <div className="topbar-actions" aria-label="File actions">
            <button type="button" onClick={() => setNewGameOverlayOpen(true)}>New</button>
            <button type="button" onClick={() => setPackageManagerOpen(true)}>Open</button>
            <button type="button" onClick={() => setPackageManagerOpen(true)}>Save</button>
            <button type="button" onClick={() => setPackageManagerOpen(true)}>Export</button>
            <button type="button" onClick={() => setPackageManagerOpen(true)}>Share</button>
          </div>
        </div>
        <div className="topbar-right">
          {multiplayer.isConnected && (
            <div
              className="topbar-sync-pill"
              style={{ background: isUnified ? '#166534' : '#92400e' }}
            >
              {isUnified ? '✓ Unified' : '⚠ Independent'}
            </div>
          )}
          <div className="game-status-pill">{displayStatus}</div>
          {!activeCustomRuleset && !isTerminalGame && (
            <button
              onClick={() => resignGame(multiplayer.playerColor || gameState.turn)}
              className="topbar-danger-btn"
            >
              Resign
            </button>
          )}
          <button
            type="button"
            className="header-profile-badge"
            onClick={() => {
              if (!settings.activeViews.includes('profile')) toggleView('profile');
            }}
            title="Open Profile"
          >
            {localProfile.profileImage ? (
              <img src={localProfile.profileImage} alt="" className="header-avatar" />
            ) : (
              <div className="header-avatar-placeholder">
                {(localProfile.displayName || 'G')[0].toUpperCase()}
              </div>
            )}
            <div className="header-profile-text">
              <span className="header-profile-name">{localProfile.displayName || 'Guest Player'}</span>
              <span className="header-guest-label">{localProfile.isGuest ? 'Guest' : 'Official'}</span>
            </div>
          </button>
          <button
            onClick={toggleRightPanel}
            className="mobile-only-btn"
            style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem' }}
          >
            ☰
          </button>
        </div>
      </header>
      <AudioController />

      <Overlay
        isOpen={resetConfirmationOpen}
        onClose={() => setResetConfirmationOpen(false)}
        title="Reset System"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '0.9rem', color: '#2c3e50', lineHeight: 1.45 }}>
            This will reset Chess Unleashed to system defaults. Unsaved settings, imported themes, and current games may be lost. Are you sure?
          </div>
          <div style={{ fontSize: '0.75rem', color: '#7f8c8d' }}>
            To restart the server, stop and rerun node server/chessServer.js.
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setResetConfirmationOpen(false)}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', color: '#2c3e50', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
                clearErrorLogEntries();
                window.location.reload();
              }}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #b42318', background: '#b42318', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
            >
              Reset System
            </button>
          </div>
        </div>
      </Overlay>

      <Overlay
        isOpen={newGameOverlayOpen}
        onClose={() => setNewGameOverlayOpen(false)}
        title="Let's Play!"
      >
        <LetsPlaySetupView closeOverlay={() => setNewGameOverlayOpen(false)} />
      </Overlay>

      <Overlay
        isOpen={packageManagerOpen}
        onClose={() => setPackageManagerOpen(false)}
        title="Package Manager"
      >
        <ImportExportView closeOverlay={() => setPackageManagerOpen(false)} />
      </Overlay>

      {activeMobileSection && (
        <MobileMenuSheet
          sectionId={activeMobileSection}
          onClose={() => setActiveMobileSection(null)}
          onAction={handleMenuAction}
        />
      )}

      <div
        className="workspace-container"
        style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        {/* Template background layers fill the full workspace */}
        <div data-layer="background-color" style={{ ...getLayerColorStyles(background), zIndex: 0 }} />
        <div data-layer="background-image" style={{ ...getLayerImageStyles(background), zIndex: 0 }} />

        <div
          className="layout-grid workspace-grid"
          style={{
            gridTemplateColumns: '1fr',
            position: 'relative',
            zIndex: 1
          }}
        >
        <main ref={centerPanelRef} className="center-panel" style={{ position: 'relative' }}>
          <div data-layer="frame-image" style={{ ...getFrameLayerImageStyles(frameLayer), zIndex: 2 }} />
          {showGameEndOverlay && (
            <GameEndOverlay
              gameState={gameState}
              timeoutResult={timeoutResult}
              resignationResult={resignationResult}
              playerColor={multiplayer.playerColor}
              onRematch={resetGame}
              onNewGame={handleNewGame}
              onDismiss={() => setDismissedGameEndOverlay(true)}
            />
          )}

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
            ) : isEventBuilderActive ? (
              <EventBuilderView />
            ) : isAnimationBuilderActive ? (
              <AnimationBuilderView />
            ) : (
              <div ref={timerDragBounds} data-layer="outer-wrapper" className="workspace-board-area" style={{ position: 'relative', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', maxWidth: '100%', boxSizing: 'border-box' }}>
                {/* TODO: future timer behavior modes can add jumping or event-driven placement without changing TimerView. */}
                {isDraggableTimer && (
                  <div
                    ref={draggableTimerRef}
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      const rect = draggableTimerRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      timerDragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
                      setIsTimerDragging(true);
                      document.body.style.cursor = 'move';
                    }}
                    style={{
                      position: 'absolute',
                      left: draggableTimerPosition.x,
                      top: draggableTimerPosition.y,
                      zIndex: 6,
                      cursor: 'move',
                      maxWidth: 'min(520px, calc(100% - 16px))',
                      touchAction: 'none'
                    }}
                  >
                    <TimerView displayMode="center" />
                  </div>
                )}
                {showBoardTimer && !isDraggableTimer && timerPlacement === 'top' && (
                  <TimerView displayMode="center" />
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', alignItems: 'center', columnGap: '12px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', minWidth: 0 }}>
                    {showBoardTimer && !isDraggableTimer && timerPlacement === 'left' && (
                      <TimerView displayMode="side" />
                    )}
                  </div>
				 <div ref={boardWrapperRef} data-layer="board-wrapper" className="workspace-board-shell" style={{ position: 'relative', zIndex: 2, padding: '20px' }}>
                    <div style={{ position: 'relative', zIndex: 2 }}>
                      {activeCustomRuleset ? (
                        <CustomGameRuntimeView
                          ruleset={activeCustomRuleset}
                          onEnd={() => {
                            clearGameSnapshot();
                            setActiveCustomRulesetId(null);
                          }}
                        />
                      ) : (
                        <ChessBoard
                          orientation={activeControlMode === 'b' ? 'b' : 'w'}
                          controlMode={activeControlMode}
                        />
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-start', minWidth: 0 }}>
                    {showBoardTimer && !isDraggableTimer && timerPlacement === 'right' && (
                      <TimerView displayMode="side" />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {settings.activeViews.includes('chat') && (
            <ChatContainer requiredPosition="bottom" />
          )}
        </main>
        </div>

        {/* Floating left dock */}
        <aside
          className="left-panel left-panel-float mobile-hidden"
          style={{
            ...getSidePanelStyles(),
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${leftPanelCollapsed ? 52 : leftWidth}px`,
            zIndex: 200,
            transition: 'width 0.22s ease',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <div
            className="panel-header"
            style={{
              borderTop: `3px solid ${settings.uiAppearance.accentColor}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0
            }}
          >
            {!leftPanelCollapsed && <span>Tool Palette</span>}
            <button
              onClick={() => setLeftPanelCollapsed(current => !current)}
              title={leftPanelCollapsed ? 'Expand launcher' : 'Collapse launcher'}
              style={{ padding: '2px 8px', fontSize: '0.7rem', borderRadius: getButtonRadius(), marginLeft: 'auto' }}
            >
              {leftPanelCollapsed ? '›' : '‹'}
            </button>
          </div>
          {leftPanelCollapsed ? (
            <button
              onClick={() => setLeftPanelCollapsed(false)}
              title="Expand launcher"
              style={{ margin: '8px 4px', padding: '8px 4px', fontSize: '0.65rem', borderRadius: getButtonRadius() }}
            >
              ›
            </button>
          ) : (
            <>
              <DynamicMenu
                items={MENU_SCHEMA}
                onAction={handleMenuAction}
                onRootItemSelect={(item) => setActiveLauncherItem(item)}
              />
              <div
                className="welcome-sidebar-container"
                style={getWelcomeContainerStyles()}
              >
                <WelcomeView />
              </div>
            </>
          )}
        </aside>

        {activeLauncherItem && (
          <div
            className="launcher-sub-panel"
            style={{
              ...getSidePanelStyles(),
              position: 'absolute',
              left: leftPanelCollapsed ? 52 : leftWidth,
              top: 0,
              height: '100%',
              width: 256,
              zIndex: 198,
              transition: 'left 0.22s ease',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div
              className="panel-header"
              style={{
                borderTop: `3px solid ${settings.uiAppearance.accentColor}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                flexShrink: 0
              }}
            >
              <span>{activeLauncherItem.label}</span>
              <button
                onClick={() => setActiveLauncherItem(null)}
                title="Close panel"
                style={{ padding: '2px 8px', fontSize: '0.7rem', borderRadius: getButtonRadius() }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {activeLauncherItem.children && (
                <DynamicMenu
                  items={activeLauncherItem.children}
                  onAction={handleMenuAction}
                  depth={1}
                />
              )}
            </div>
          </div>
        )}

        <aside
          className={`right-panel right-panel-float ${rightPanelOpen ? 'open' : ''}`}
          style={{
            ...getSidePanelStyles(),
            position: 'absolute',
            right: 0,
            top: 0,
            height: '100%',
            width: `${rightWidth}px`,
            zIndex: 200,
            transform: rightPanelCollapsed ? `translateX(${rightWidth}px)` : 'translateX(0)',
            transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Left-edge resize handle */}
          <div
            className="right-panel-resizer"
            onMouseDown={() => {
              isDraggingRight.current = true;
              document.body.style.cursor = 'col-resize';
            }}
          />
          <div
            className="panel-header"
            style={{
              borderTop: `3px solid ${settings.uiAppearance.accentColor}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>Workspace</span>
            <button
              onClick={toggleRightPanel}
              title="Collapse workspace panel"
              style={{ padding: '2px 8px', fontSize: '0.7rem', borderRadius: getButtonRadius() }}
            >
              ›
            </button>
          </div>
          <div style={{ padding: `${densitySpacing}px`, flex: 1, overflowY: 'auto', minHeight: 0 }}>
            <ViewManager />
          </div>
        </aside>

        {/* Activator tab — visible when panel is collapsed */}
        <button
          className="right-panel-activator mobile-hidden"
          onClick={() => setRightPanelCollapsed(false)}
          title="Open workspace panel"
          style={{
            position: 'absolute',
            right: 0,
            top: '50%',
            zIndex: 201,
            padding: '6px 4px',
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'translateY(-50%)',
            opacity: rightPanelCollapsed ? 1 : 0,
            pointerEvents: rightPanelCollapsed ? 'auto' : 'none',
            transition: 'opacity 0.2s',
            fontSize: '0.68rem',
            letterSpacing: '0.06em',
            cursor: 'pointer',
            borderRadius: `${getButtonRadius()}px 0 0 ${getButtonRadius()}px`,
            backgroundColor: isGlassWorkspace ? 'rgba(2,6,23,0.82)' : settings.uiAppearance.toolbarBackgroundColor,
            color: isGlassWorkspace ? '#94a3b8' : '#e5edf7',
            border: `1px solid ${isGlassWorkspace ? 'rgba(148,163,184,0.22)' : 'rgba(255,255,255,0.12)'}`,
            borderRight: 'none'
          }}
        >
          ‹ Workspace
        </button>
      </div>

      <div className="mobile-bottom-nav mobile-only">
        <div className="mobile-nav-item" onClick={() => setActiveMobileSection('appearance')}>🎨 Look</div>
        <div className="mobile-nav-item" onClick={() => setActiveMobileSection('audio-config')}>🎵 Audio</div>
        <div className="mobile-nav-item" onClick={() => setActiveMobileSection('gamemodes')}>♟️ Play</div>
        <div className="mobile-nav-item" onClick={toggleRightPanel}>👁️ View</div>
      </div>

      {settings.activeViews.includes('chat') && (
        <ChatContainer requiredPosition="floating" />
      )}
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
