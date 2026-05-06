import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { useSettings } from '../context/SettingsContext';
import type { SettingsState } from '../context/SettingsContext';
import { validateConfig } from '../validation/ConfigValidationRegistry';
import { getWinConditionSummary, isSandboxPlayableRuleset } from '../rules/RulePackages';
import type { CustomRuleset } from '../rules/RulePackages';

interface LetsPlaySetupViewProps {
  closeOverlay?: () => void;
  onOpenFicsWindow?: () => void;
}

const setupButtonStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid rgba(148, 163, 184, 0.24)',
  background: 'rgba(15, 23, 42, 0.72)',
  color: '#dbeafe',
  cursor: 'default',
  fontWeight: 600,
  textAlign: 'left',
  minHeight: 44
};

const setupSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  padding: '12px',
  borderRadius: 8,
  border: '1px solid rgba(148, 163, 184, 0.18)',
  background: 'rgba(8, 18, 34, 0.78)'
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '0.85rem',
  color: '#2c3e50'
};

const getSetupButtonStyle = (active = false, disabled = false): React.CSSProperties => ({
  ...setupButtonStyle,
  border: active ? '2px solid rgba(56, 189, 248, 0.78)' : setupButtonStyle.border,
  background: active ? 'rgba(14, 47, 72, 0.72)' : setupButtonStyle.background,
  color: disabled ? '#94a3b8' : setupButtonStyle.color,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.75 : 1
});

const MIN_INITIAL_TIME_SECONDS = 3;

const formatTimerSummary = (seconds: number, increment: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = +(seconds - minutes * 60).toFixed(1);
  const duration = minutes > 0
    ? `${minutes}m ${remainingSeconds}s`
    : `${remainingSeconds}s`;
  return `${duration}${increment > 0 ? ` + ${increment}s` : ''}`;
};

const getPieceSummary = (settings: SettingsState) => {
  const { pieceThemeMode, pieceTheme, whitePieceTheme, blackPieceTheme, pieceSet } = settings.template;
  if (pieceThemeMode === 'team') {
    const whiteLabel = whitePieceTheme?.type === 'custom' ? 'Custom' : (whitePieceTheme?.builtinSet || pieceSet);
    const blackLabel = blackPieceTheme?.type === 'custom' ? 'Custom' : (blackPieceTheme?.builtinSet || pieceSet);
    return `Team pieces (${whiteLabel} / ${blackLabel})`;
  }

  return pieceTheme.type === 'custom'
    ? 'Custom pieces'
    : `Built-in pieces (${pieceTheme.builtinSet || pieceSet})`;
};

const getCustomGameStatus = (ruleset: CustomRuleset) => {
  const readiness = isSandboxPlayableRuleset(ruleset);
  const messages = readiness.messages.filter(message => message !== 'Ruleset metadata looks valid.');
  if (readiness.playable) {
    return { label: 'Ready to Play', color: '#86efac', background: 'rgba(20, 83, 45, 0.32)', border: 'rgba(74, 222, 128, 0.36)', reason: '' };
  }
  if (ruleset.status === 'approved') {
    return { label: 'Unsupported Features', color: '#fbbf24', background: 'rgba(120, 53, 15, 0.28)', border: 'rgba(251, 191, 36, 0.35)', reason: messages[0] ?? 'This custom game uses rules the first runtime cannot play yet.' };
  }
  return { label: 'Needs Review', color: 'rgba(148, 163, 184, 0.28)', background: 'rgba(15, 23, 42, 0.72)', border: 'rgba(148, 163, 184, 0.28)', reason: messages[0] ?? 'Approve this custom game in Rule Builder first.' };
};

const LetsPlaySetupView: React.FC<LetsPlaySetupViewProps> = ({ closeOverlay, onOpenFicsWindow }) => {
  const { settings, setGameMode, updateTimeControl, updateMultiplayerServer, toggleView, setActiveEngineId } = useSettings();
  const { resetGame, startVsComputer, createRoom, joinRoom, gameStartError } = useGame();
  const [joinRoomId, setJoinRoomId] = useState('');
  const [setupError, setSetupError] = useState('');
  const [selectedCustomRulesetId, setSelectedCustomRulesetId] = useState('');
  const [botSetupSelected, setBotSetupSelected] = useState(false);
  const [botPlayerSide, setBotPlayerSide] = useState<'w' | 'b' | null>(null);
  const [onlineSetupSelected, setOnlineSetupSelected] = useState(false);
  const botPanelOpen = settings.activeViews.includes('computer-opponent');
  const botSetupActive = botSetupSelected || botPanelOpen;
  const multiplayerSetupActive = settings.activeViews.includes('multiplayer');
  const onlineSetupActive = onlineSetupSelected;
  const localPlayerActive = !botSetupActive && !multiplayerSetupActive && !onlineSetupActive;
  const customGameSelected = settings.gameMode === 'variant';
  const modeSummary = settings.gameMode === 'standard' ? 'Standard Chess' : 'Custom Game';
  const opponentSummary = botSetupActive
    ? 'Bot'
    : multiplayerSetupActive
      ? 'LAN'
      : onlineSetupActive
        ? 'Online / FICS'
        : 'Local Player';
  const timerSummary = settings.timeControl.enabled
    ? `Timed (${formatTimerSummary(settings.timeControl.initialTimeSeconds, settings.timeControl.incrementSeconds)})`
    : 'No Timer';
  const pieceSummary = getPieceSummary(settings);
  const serverLabel = settings.multiplayerServer.mode === 'home'
    ? 'Home Server'
    : settings.multiplayerServer.mode === 'custom'
      ? 'Custom Server'
      : 'Official Server';
  const serverValue = settings.multiplayerServer.mode === 'home'
    ? settings.multiplayerServer.homeUrl
    : settings.multiplayerServer.customUrl;
  const initialMinutes = Math.floor(settings.timeControl.initialTimeSeconds / 60);
  const initialSeconds = +(settings.timeControl.initialTimeSeconds - initialMinutes * 60).toFixed(1);
  const validation = validateConfig({ settings });
  const validationError = validation.issues.find(issue => issue.severity === 'error');
  const approvedCustomRulesets = settings.customRulesets.filter(ruleset => ruleset.status === 'approved');
  const selectedCustomRuleset =
    approvedCustomRulesets.find(ruleset => ruleset.id === selectedCustomRulesetId) ??
    approvedCustomRulesets[0] ??
    null;
  const selectedCustomReadiness = selectedCustomRuleset ? isSandboxPlayableRuleset(selectedCustomRuleset) : null;
  const customGameBlockedReason = !selectedCustomRuleset
    ? 'Approve a custom ruleset in Rule Builder before starting Custom Game.'
    : !selectedCustomReadiness?.playable
      ? selectedCustomReadiness?.messages.find(message => message !== 'Ruleset metadata looks valid.') ?? 'This custom game is not sandbox-playable yet.'
      : botSetupActive || multiplayerSetupActive || onlineSetupActive
        ? 'Custom Game is local-only for now. Choose Local Player.'
        : '';
  const botBlockedReason = botSetupActive && !botPlayerSide
    ? 'Choose your side before starting a bot game.'
    : '';
  const startBlockedReason = customGameSelected
    ? customGameBlockedReason
    : botBlockedReason || (validationError?.message ?? '');
  const canStart = !startBlockedReason;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) setJoinRoomId(roomParam.toUpperCase());
  }, []);

  const activateSetupView = (viewId: 'computer-opponent' | 'multiplayer', otherViewId: 'computer-opponent' | 'multiplayer') => {
    setSetupError('');
    setOnlineSetupSelected(false);
    if (viewId === 'computer-opponent') {
      setBotSetupSelected(true);
      if (settings.activeViews.includes('multiplayer')) toggleView('multiplayer');
      return;
    }
    setBotSetupSelected(false);
    setBotPlayerSide(null);
    setOnlineSetupSelected(false);
    if (!settings.activeViews.includes(viewId)) toggleView(viewId);
    if (settings.activeViews.includes(otherViewId)) toggleView(otherViewId);
  };

  const activateLocalPlayer = () => {
    setSetupError('');
    setOnlineSetupSelected(false);
    setBotSetupSelected(false);
    setBotPlayerSide(null);
    if (botPanelOpen) toggleView('computer-opponent');
    if (multiplayerSetupActive) toggleView('multiplayer');
  };

  const resetSetup = () => {
    setSetupError('');
    setGameMode('standard');
    updateTimeControl({ enabled: false });
    setBotSetupSelected(false);
    setBotPlayerSide(null);
    setOnlineSetupSelected(false);
    if (botPanelOpen) toggleView('computer-opponent');
    if (multiplayerSetupActive) toggleView('multiplayer');
  };

  const activateOnlineSetup = () => {
    setSetupError('');
    setBotSetupSelected(false);
    setBotPlayerSide(null);
    setOnlineSetupSelected(true);
    if (botPanelOpen) toggleView('computer-opponent');
    if (multiplayerSetupActive) toggleView('multiplayer');
  };

  const openFicsWindow = () => {
    setSetupError('');
    if (onOpenFicsWindow) {
      onOpenFicsWindow();
    } else {
      window.dispatchEvent(new CustomEvent('chess-unleashed-open-fics'));
    }
    closeOverlay?.();
  };

  const updateInitialTime = (nextMinutes: number, nextSeconds: number) => {
    setSetupError('');
    const boundedMinutes = Math.max(0, Math.floor(nextMinutes));
    const boundedSeconds = Math.max(0, Math.min(59.9, nextSeconds));
    updateTimeControl({
      initialTimeSeconds: Math.max(MIN_INITIAL_TIME_SECONDS, +(boundedMinutes * 60 + boundedSeconds).toFixed(1))
    });
  };

  const openAdvancedTimer = () => {
    if (!settings.activeViews.includes('timer-settings')) toggleView('timer-settings');
    closeOverlay?.();
  };

  const openBotControls = () => {
    if (!settings.activeViews.includes('computer-opponent')) toggleView('computer-opponent');
  };

  const startGame = () => {
    setSetupError('');

    if (!canStart) {
      setSetupError(startBlockedReason);
      return;
    }

    if (onlineSetupActive) {
      openFicsWindow();
      return;
    }

    if (customGameSelected && selectedCustomRuleset) {
      window.dispatchEvent(new CustomEvent('chess-unleashed-start-custom-game', {
        detail: { rulesetId: selectedCustomRuleset.id }
      }));
      closeOverlay?.();
      return;
    }

    window.dispatchEvent(new CustomEvent('chess-unleashed-end-custom-game'));
    
    if (botSetupActive) {
      if (!botPlayerSide) {
        setSetupError('Choose your side before starting a bot game.');
        return;
      }
      startVsComputer(botPlayerSide);
    } else if (multiplayerSetupActive) {
      createRoom();
    } else {
      resetGame();
    }

    closeOverlay?.();
  };

  const joinOnlineMatch = () => {
    setSetupError('');

    if (!canStart) {
      setSetupError(startBlockedReason);
      return;
    }

    const normalizedRoomId = joinRoomId.trim().toUpperCase();
    if (!normalizedRoomId) {
      setSetupError('Enter an invite code to join a LAN match.');
      return;
    }

    joinRoom('', normalizedRoomId);
    closeOverlay?.();
  };

  return (
    <div className="view-container" style={{ color: '#cbd5e1' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <section style={setupSectionStyle}>
          <h4 style={sectionTitleStyle}>Game Mode</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                setSetupError('');
                setGameMode('standard');
              }}
              style={getSetupButtonStyle(settings.gameMode === 'standard')}
            >
              Standard Chess
            </button>
            <button
              type="button"
              onClick={() => {
                setSetupError('');
                setGameMode('variant');
                if (!selectedCustomRulesetId && approvedCustomRulesets[0]) setSelectedCustomRulesetId(approvedCustomRulesets[0].id);
              }}
              style={getSetupButtonStyle(settings.gameMode === 'variant')}
              title="Start approved custom games that are ready for the first local custom runtime."
            >
              Custom Game
            </button>
          </div>
          {customGameSelected && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Custom Game starts approved local rulesets marked Ready to Play.
              </div>
              {approvedCustomRulesets.length === 0 ? (
                <div style={{ padding: '8px', borderRadius: 6, border: '1px dashed rgba(148, 163, 184, 0.28)', color: '#94a3b8', fontSize: '0.75rem' }}>
                  No approved custom games yet. Approve a ruleset in Tools - Rule Builder.
                </div>
              ) : (
                <>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: '#94a3b8' }}>
                    <span>Approved Custom Game</span>
                    <select
                      value={selectedCustomRuleset?.id ?? ''}
                      onChange={event => {
                        setSetupError('');
                        setSelectedCustomRulesetId(event.target.value);
                      }}
                      style={{ padding: '6px', fontSize: '0.8rem', background: 'rgba(15, 23, 42, 0.72)', color: '#dbeafe', border: '1px solid rgba(148, 163, 184, 0.24)', borderRadius: 6 }}
                    >
                      {approvedCustomRulesets.map(ruleset => (
                        <option key={ruleset.id} value={ruleset.id}>{ruleset.name || 'Untitled Custom Game'} - {getCustomGameStatus(ruleset).label}</option>
                      ))}
                    </select>
                  </label>
                  {selectedCustomRuleset && (
                    <div style={{ padding: '10px', borderRadius: 8, border: '1px solid rgba(148, 163, 184, 0.18)', background: 'rgba(15, 23, 42, 0.72)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {(() => {
                        const status = getCustomGameStatus(selectedCustomRuleset);
                        return (
                          <div style={{ alignSelf: 'flex-start', padding: '3px 7px', borderRadius: 999, border: `1px solid ${status.border}`, background: status.background, color: status.color, fontSize: '0.66rem', fontWeight: 800 }}>
                            {status.label}
                          </div>
                        );
                      })()}
                      <div style={{ fontWeight: 700, color: '#dbeafe', fontSize: '0.82rem' }}>{selectedCustomRuleset.name || 'Untitled Custom Game'}</div>
                      <div style={{ fontSize: '0.74rem', color: '#b6c6d8' }}>Board: {selectedCustomRuleset.boardWidth} x {selectedCustomRuleset.boardHeight}</div>
                      <div style={{ fontSize: '0.74rem', color: '#b6c6d8' }}>Teams: {selectedCustomRuleset.teams.map(team => team.name).join(', ') || 'None'}</div>
                      <div style={{ fontSize: '0.74rem', color: '#b6c6d8' }}>Pieces: {(selectedCustomRuleset.pieces ?? []).length}</div>
                      <div style={{ fontSize: '0.74rem', color: '#b6c6d8' }}>
                        Win conditions: {(selectedCustomRuleset.winConditions ?? []).map(condition => getWinConditionSummary(condition, selectedCustomRuleset.pieces ?? [])).join('; ') || 'None'}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: selectedCustomReadiness?.playable ? '#86efac' : '#fca5a5' }}>
                        Readiness: {selectedCustomReadiness?.playable ? 'Ready for local Custom Game play' : (getCustomGameStatus(selectedCustomRuleset).reason || 'Needs Rule Builder test readiness')}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        Rulesets are reusable game definitions. In-progress custom game snapshots will be a separate future save feature.
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        <section style={setupSectionStyle}>
          <h4 style={sectionTitleStyle}>Opponent</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={activateLocalPlayer}
              style={getSetupButtonStyle(localPlayerActive)}
            >
              Local Player
            </button>
            <button
              type="button"
              onClick={() => activateSetupView('computer-opponent', 'multiplayer')}
              style={getSetupButtonStyle(botSetupActive)}
            >
              Play vs Bot
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => activateSetupView('multiplayer', 'computer-opponent')}
              style={getSetupButtonStyle(multiplayerSetupActive)}
            >
              LAN
            </button>
            <button
              type="button"
              onClick={activateOnlineSetup}
              style={getSetupButtonStyle(onlineSetupActive)}
            >
              Online
            </button>
          </div>
          {botSetupActive && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', borderRadius: 8, border: '1px solid rgba(148, 163, 184, 0.18)', background: 'rgba(15, 23, 42, 0.72)' }}>
              <div>
                <div style={{ fontSize: '0.82rem', color: '#dbeafe', fontWeight: 700 }}>Bot Setup</div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Choose your computer opponent and side before starting.</div>
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: '#94a3b8' }}>
                <span>Computer Opponent</span>
                <select
                  value={settings.activeEngineId}
                  onChange={event => {
                    setSetupError('');
                    setActiveEngineId(event.target.value);
                  }}
                  style={{ padding: '6px', fontSize: '0.8rem', background: 'rgba(15, 23, 42, 0.72)', color: '#dbeafe', border: '1px solid rgba(148, 163, 184, 0.24)', borderRadius: 6 }}
                >
                  {settings.registeredBots.map(bot => (
                    <option key={bot.id} value={bot.id}>
                      {bot.name}{bot.type !== 'mock' ? ' - browser engine' : ''}
                    </option>
                  ))}
                </select>
              </label>
              {settings.registeredBots.find(bot => bot.id === settings.activeEngineId)?.type !== 'mock' && (
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Browser engines use the worker adapter. Test the bot in Tools - Bots if you need to confirm the path.
                </div>
              )}
              <div>
                <div style={{ fontSize: '0.74rem', color: 'rgba(148, 163, 184, 0.28)', fontWeight: 700, marginBottom: '6px' }}>Choose your side</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSetupError('');
                      setBotPlayerSide('w');
                    }}
                    style={getSetupButtonStyle(botPlayerSide === 'w')}
                  >
                    Play as White
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSetupError('');
                      setBotPlayerSide('b');
                    }}
                    style={getSetupButtonStyle(botPlayerSide === 'b')}
                  >
                    Play as Black
                  </button>
                </div>
              </div>
              {botPanelOpen && (
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  The side panel can still tune bot personality and strength, but this center setup controls game start.
                </div>
              )}
              <button type="button" onClick={openBotControls} style={getSetupButtonStyle()}>
                Open Bot Controls
              </button>
            </div>
          )}
          {multiplayerSetupActive && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => updateMultiplayerServer({ mode: 'home' })}
                  style={getSetupButtonStyle(settings.multiplayerServer.mode === 'home')}
                >
                  Home Server
                </button>
                <button
                  type="button"
                  onClick={() => updateMultiplayerServer({ mode: 'custom' })}
                  style={getSetupButtonStyle(settings.multiplayerServer.mode === 'custom')}
                >
                  Custom Server
                </button>
              </div>
              <button
                type="button"
                disabled
                style={getSetupButtonStyle(settings.multiplayerServer.mode === 'official', true)}
                title="Official online server is coming later."
              >
                Official Online - Coming Later
              </button>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: '#94a3b8' }}>
                <span>{serverLabel}</span>
                <input
                  type="text"
                  value={serverValue}
                  onChange={(e) => {
                    setSetupError('');
                    updateMultiplayerServer(settings.multiplayerServer.mode === 'home' ? { homeUrl: e.target.value } : { customUrl: e.target.value });
                  }}
                  placeholder="localhost"
                  disabled={settings.multiplayerServer.mode === 'official'}
                  style={{ padding: '6px', fontSize: '0.8rem', background: 'rgba(15, 23, 42, 0.72)', color: '#dbeafe', border: '1px solid rgba(148, 163, 184, 0.24)', borderRadius: 6 }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: '#94a3b8' }}>
                <span>Invite Code</span>
                <input
                  type="text"
                  value={joinRoomId}
                  onChange={(e) => {
                    setSetupError('');
                    setJoinRoomId(e.target.value.toUpperCase());
                  }}
                  placeholder="Enter code to join"
                  style={{ padding: '6px', fontSize: '0.8rem', background: 'rgba(15, 23, 42, 0.72)', color: '#dbeafe', border: '1px solid rgba(148, 163, 184, 0.24)', borderRadius: 6 }}
                />
              </label>
              <button type="button" onClick={joinOnlineMatch} disabled={!canStart} style={getSetupButtonStyle(false, !canStart)}>
                Join LAN Match
              </button>
              <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                Start Game will host a new LAN match.
              </div>
            </div>
          )}
          {onlineSetupActive && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', borderRadius: 8, border: '1px solid rgba(56, 189, 248, 0.24)', background: 'rgba(15, 23, 42, 0.72)' }}>
              <div>
                <div style={{ fontSize: '0.82rem', color: '#dbeafe', fontWeight: 700 }}>FICS Online</div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Open one dockable FICS window with Online and Console tabs.</div>
              </div>
              <button type="button" onClick={openFicsWindow} style={getSetupButtonStyle()}>
                Open FICS
              </button>
            </div>
          )}
        </section>

        <section style={setupSectionStyle}>
          <h4 style={sectionTitleStyle}>Timer</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                setSetupError('');
                updateTimeControl({ enabled: false });
              }}
              style={getSetupButtonStyle(!settings.timeControl.enabled)}
            >
              No Timer
            </button>
            <button
              type="button"
              onClick={() => {
                setSetupError('');
                updateTimeControl({ enabled: true });
              }}
              style={getSetupButtonStyle(settings.timeControl.enabled)}
            >
              Timed Game
            </button>
          </div>
          {settings.timeControl.enabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: '#94a3b8' }}>
                  <span>Minutes</span>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    step="1"
                    value={initialMinutes}
                    onChange={(e) => updateInitialTime(parseInt(e.target.value, 10) || 0, initialSeconds)}
                    style={{ padding: '6px', fontSize: '0.8rem', background: 'rgba(15, 23, 42, 0.72)', color: '#dbeafe', border: '1px solid rgba(148, 163, 184, 0.24)', borderRadius: 6 }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: '#94a3b8' }}>
                  <span>Seconds</span>
                  <input
                    type="number"
                    min="0"
                    max="59.9"
                    step="0.1"
                    value={initialSeconds}
                    onChange={(e) => updateInitialTime(initialMinutes, parseFloat(e.target.value) || 0)}
                    style={{ padding: '6px', fontSize: '0.8rem', background: 'rgba(15, 23, 42, 0.72)', color: '#dbeafe', border: '1px solid rgba(148, 163, 184, 0.24)', borderRadius: 6 }}
                  />
                </label>
              </div>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
                <span>Increment ({settings.timeControl.incrementSeconds}s)</span>
                <input
                  type="number"
                  min="0"
                  max="60"
                  step="1"
                  value={settings.timeControl.incrementSeconds}
                  onChange={(e) => {
                    setSetupError('');
                    updateTimeControl({ incrementSeconds: Math.max(0, parseInt(e.target.value, 10) || 0) });
                  }}
                  style={{ width: '70px', padding: '4px', fontSize: '0.8rem', background: 'rgba(15, 23, 42, 0.72)', color: '#dbeafe', border: '1px solid rgba(148, 163, 184, 0.24)', borderRadius: 6 }}
                />
              </label>
              <button type="button" onClick={openAdvancedTimer} style={getSetupButtonStyle()}>
                Advanced Timer Settings
              </button>
            </div>
          )}
        </section>

        <section style={{ ...setupSectionStyle, gap: '4px' }}>
          <h4 style={sectionTitleStyle}>Current Setup</h4>
          <div style={{ fontSize: '0.8rem', color: '#b6c6d8' }}>Mode: {modeSummary}</div>
          {customGameSelected && selectedCustomRuleset && (
            <div style={{ fontSize: '0.8rem', color: '#b6c6d8' }}>Custom Game: {selectedCustomRuleset.name}</div>
          )}
          <div style={{ fontSize: '0.8rem', color: '#b6c6d8' }}>Opponent: {opponentSummary}</div>
          {botSetupActive && (
            <>
              <div style={{ fontSize: '0.8rem', color: '#b6c6d8' }}>
                Bot: {settings.registeredBots.find(bot => bot.id === settings.activeEngineId)?.name ?? settings.activeEngineId}
              </div>
              <div style={{ fontSize: '0.8rem', color: botPlayerSide ? '#b6c6d8' : '#fca5a5' }}>
                Your side: {botPlayerSide === 'w' ? 'White' : botPlayerSide === 'b' ? 'Black' : 'Choose White or Black'}
              </div>
            </>
          )}
          <div style={{ fontSize: '0.8rem', color: '#b6c6d8' }}>Timer: {timerSummary}</div>
          <div style={{ fontSize: '0.8rem', color: '#b6c6d8' }}>Pieces: {pieceSummary}</div>
          {settings.themeDraft && (
            <div style={{ color: '#fbbf24', fontSize: '0.75rem', marginTop: '4px' }}>
              Unapplied piece edits are open. Gameplay uses the last applied pieces until you apply them.
            </div>
          )}
        </section>

        <button
          type="button"
          onClick={startGame}
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            border: '1px solid rgba(56, 189, 248, 0.38)',
            background: canStart ? 'rgba(14, 47, 72, 0.90)' : 'rgba(71, 85, 105, 0.60)',
            color: '#fff',
            cursor: canStart ? 'pointer' : 'not-allowed',
            fontWeight: 700
          }}
          disabled={!canStart}
        >
          {customGameSelected ? 'Start Custom Game' : botSetupActive ? 'Start Bot Game' : multiplayerSetupActive ? 'Host LAN Match' : onlineSetupActive ? 'Open FICS' : 'Start Game'}
        </button>
        <button type="button" onClick={resetSetup} style={{ ...getSetupButtonStyle(), alignSelf: 'flex-start' }}>
          Reset Setup
        </button>
        {(setupError || startBlockedReason || gameStartError) && (
          <div style={{ color: '#fca5a5', fontSize: '0.75rem' }}>
            {setupError || startBlockedReason || gameStartError}
          </div>
        )}
      </div>
    </div>
  );
};

export default LetsPlaySetupView;
