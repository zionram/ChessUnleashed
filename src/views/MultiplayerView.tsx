import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { useSettings } from '../context/SettingsContext';
import {
  EXPERIENCE_COMPLIANCE_CATEGORIES,
  type ExperienceComplianceCategoryId,
  type ExperienceComplianceMode
} from '../packages/ExperienceCompliancePolicy';
import type { LanDiscoveredGame, LanServerInfo } from '../electron-assets';

const COMPLIANCE_CATEGORY_LABELS: Record<ExperienceComplianceCategoryId, string> = {
  rules: 'Rules',
  timer: 'Timer',
  board: 'Board',
  pieces: 'Pieces',
  uiAppearance: 'Platform UI',
  audio: 'Audio',
  chat: 'Chat',
  bot: 'Bot'
};

const COMPLIANCE_MODES: Array<{ label: string; value: ExperienceComplianceMode }> = [
  { label: 'Force', value: 'force' },
  { label: 'Allow Override', value: 'allowOverride' },
  { label: 'Ignore', value: 'ignore' }
];

const ACTIVE_SYNC_CATEGORIES = new Set<ExperienceComplianceCategoryId>(['rules', 'board', 'pieces']);

const MultiplayerView: React.FC = () => {
  const { multiplayer, createRoom, joinRoom, leaveRoom, requestUndo, handleUndoResponse, updateRoomSettings, acceptComplianceResolution, declineComplianceResolution, requestHostAssets } = useGame();
  const { settings, updateMultiplayerServer } = useSettings();
  const localProfile = settings.localProfile;
  const serverConfig = settings.multiplayerServer;
  
  const [joinRoomId, setJoinRoomId] = useState('');
  const [copied, setCopied] = useState(false);
  const [testStatus, setTestResult] = useState<{ status: 'idle' | 'testing' | 'pass' | 'fail'; message?: string }>({ status: 'idle' });
  const [lanGames, setLanGames] = useState<LanDiscoveredGame[]>([]);
  const [lanServerInfo, setLanServerInfo] = useState<LanServerInfo | null>(null);
  const [lanStatus, setLanStatus] = useState<{ state: 'idle' | 'listening' | 'hosting' | 'unavailable' | 'error'; message: string }>({
    state: 'idle',
    message: ''
  });

  const isHost = multiplayer.playerColor === 'w';
  const lanApi = typeof window !== 'undefined' ? window.chessUnleashedLan : undefined;

  // Prefill room ID from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) setJoinRoomId(roomParam.toUpperCase());
  }, []);

  useEffect(() => {
    if (!lanApi) {
      setLanStatus({
        state: 'unavailable',
        message: 'LAN discovery is available in the packaged desktop app. Manual IP join still works here.'
      });
      return;
    }

    let active = true;
    const unsubscribe = lanApi.onGamesUpdated((games) => {
      if (!active) return;
      setLanGames(games);
    });

    lanApi.startListening()
      .then(result => {
        if (!active) return;
        if (result.serverInfo) setLanServerInfo(result.serverInfo);
        setLanGames(result.games ?? []);
        setLanStatus(result.available
          ? { state: 'listening', message: 'Scanning for LAN games on this network.' }
          : { state: 'unavailable', message: result.error || 'LAN discovery is unavailable. Manual IP join still works.' });
      })
      .catch(error => {
        if (!active) return;
        console.warn('[LAN Discovery] Could not start listener:', error);
        setLanStatus({ state: 'error', message: 'LAN discovery could not start. Manual IP join still works.' });
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [lanApi]);

  useEffect(() => {
    if (!lanApi || !multiplayer.isConnected || !isHost || !multiplayer.roomId) {
      if (lanApi && (!multiplayer.isConnected || !isHost)) {
        lanApi.stopBroadcast().catch(error => console.warn('[LAN Discovery] Could not stop broadcast:', error));
      }
      return;
    }

    let active = true;
    lanApi.startBroadcast({
      hostDisplayName: localProfile.displayName || 'Guest Player',
      roomId: multiplayer.roomId,
      gameModeLabel: 'Standard Chess'
    })
      .then(result => {
        if (!active) return;
        if (result.serverInfo) setLanServerInfo(result.serverInfo);
        setLanStatus(result.available
          ? { state: 'hosting', message: 'Hosting on this network. Other computers should see this room automatically.' }
          : { state: 'error', message: result.error || 'LAN broadcast could not start. Manual IP join still works.' });
      })
      .catch(error => {
        if (!active) return;
        console.warn('[LAN Discovery] Could not start broadcast:', error);
        setLanStatus({ state: 'error', message: 'LAN broadcast could not start. Manual IP join still works.' });
      });

    return () => {
      active = false;
      lanApi.stopBroadcast().catch(error => console.warn('[LAN Discovery] Could not stop broadcast:', error));
    };
  }, [lanApi, multiplayer.isConnected, isHost, multiplayer.roomId, localProfile.displayName]);

  const serverUrl = serverConfig.mode === 'home' ? serverConfig.homeUrl : serverConfig.mode === 'custom' ? serverConfig.customUrl : '';
  const resolvedHost = (serverUrl && serverUrl !== 'localhost') ? serverUrl : 'localhost';

  const testConnection = async () => {
    if (serverConfig.mode === 'official') {
        setTestResult({ status: 'fail', message: 'Official server is coming later.' });
        return;
    }
    
    const host = resolvedHost;
    setTestResult({ status: 'testing' });
    
    try {
      const ws = new WebSocket(`ws://${host}:8080`);
      const timeout = setTimeout(() => {
        ws.close();
        setTestResult({ status: 'fail', message: 'Connection timed out. Ensure server is running.' });
      }, 3000);

      ws.onopen = () => {
        clearTimeout(timeout);
        ws.close();
        setTestResult({ status: 'pass', message: 'Successfully reached server!' });
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        setTestResult({ status: 'fail', message: 'Connection failed. Start your home server, then try again.' });
      };
    } catch (err) {
      setTestResult({ status: 'fail', message: 'Invalid server URL format.' });
    }
  };

  const profileInitials = localProfile.displayName.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'GP';

  const copyRoomLink = () => {
    if (!multiplayer.roomId) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${multiplayer.roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hostLanGame = async () => {
    setLanStatus({ state: 'listening', message: 'Starting local LAN host...' });
    try {
      const info = await lanApi?.getServerInfo();
      if (info) setLanServerInfo(info);
      createRoom('localhost');
    } catch (error) {
      console.warn('[LAN Discovery] Could not prepare LAN host:', error);
      setLanStatus({ state: 'error', message: 'LAN hosting could not prepare discovery. Starting manual host instead.' });
      createRoom();
    }
  };

  const joinLanGame = (game: LanDiscoveredGame) => {
    setJoinRoomId(game.roomId);
    setLanStatus({ state: 'listening', message: `Joining ${game.hostDisplayName}'s LAN game...` });
    joinRoom(`${game.hostAddress}:${game.serverPort}`, game.roomId);
  };

  const onSettingToggle = (key: 'enforceSharedExp' | 'allowPersonalPieces') => {
    updateRoomSettings({
      enforceSharedExp: key === 'enforceSharedExp' ? !multiplayer.enforceSharedExp : multiplayer.enforceSharedExp,
      allowPersonalPieces: key === 'allowPersonalPieces' ? !multiplayer.allowPersonalPieces : multiplayer.allowPersonalPieces
    });
  };

  const updateComplianceCategory = (categoryId: ExperienceComplianceCategoryId, mode: ExperienceComplianceMode) => {
    updateRoomSettings({
      enforceSharedExp: multiplayer.enforceSharedExp,
      allowPersonalPieces: multiplayer.allowPersonalPieces,
      compliancePolicy: multiplayer.compliancePolicy.map(rule =>
        rule.categoryId === categoryId ? { ...rule, mode } : rule
      )
    });
  };

  const getComplianceModeLabel = (mode: ExperienceComplianceMode) => (
    mode === 'allowOverride' ? 'Allow Override' : mode === 'force' ? 'Force' : 'Ignore'
  );

  const renderExperienceSyncPolicy = (editable: boolean) => (
    <div style={{ borderTop: '1px solid #e3f2fd', paddingTop: '10px', marginTop: '4px' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '6px', color: '#1976d2' }}>Host Experience Rules</div>
      <div style={{ fontSize: '0.65rem', color: '#666', marginBottom: '8px', lineHeight: 1.35 }}>
        Rules, board, and pieces are active now. Other categories are prepared for future ExperiencePackage sync.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {EXPERIENCE_COMPLIANCE_CATEGORIES.map(categoryId => {
          const rule = multiplayer.compliancePolicy.find(item => item.categoryId === categoryId);
          return (
            <label key={categoryId} style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '8px', alignItems: 'center', fontSize: '0.68rem' }}>
              <span>
                {COMPLIANCE_CATEGORY_LABELS[categoryId]}
                <span style={{ color: ACTIVE_SYNC_CATEGORIES.has(categoryId) ? '#1976d2' : '#8a94a6', marginLeft: '4px' }}>
                  {ACTIVE_SYNC_CATEGORIES.has(categoryId) ? 'active' : 'prepared'}
                </span>
              </span>
              {editable ? (
                <select
                  value={rule?.mode ?? 'ignore'}
                  onChange={(e) => updateComplianceCategory(categoryId, e.target.value as ExperienceComplianceMode)}
                  style={{ padding: '4px 6px', fontSize: '0.68rem', borderRadius: '4px', border: '1px solid #bbdefb' }}
                >
                  {COMPLIANCE_MODES.map(mode => (
                    <option key={mode.value} value={mode.value}>{mode.label}</option>
                  ))}
                </select>
              ) : (
                <span style={{ color: '#455a64', textAlign: 'right' }}>{getComplianceModeLabel(rule?.mode ?? 'ignore')}</span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );

  const renderComplianceResolution = () => {
    if (!multiplayer.complianceResolution) return null;

    return (
      <div style={{ marginTop: '10px', padding: '10px', borderRadius: '6px', border: '1px solid #f6c453', background: '#fff8e1' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#7a4f01', marginBottom: '5px' }}>Experience Sync Needs Approval</div>
        <div style={{ fontSize: '0.68rem', color: '#7a4f01', lineHeight: 1.35 }}>
          {multiplayer.complianceResolution.message}
        </div>
        <div style={{ fontSize: '0.65rem', color: '#7a4f01', marginTop: '5px' }}>
          Missing: {multiplayer.complianceResolution.missingItems.join(', ')}
        </div>
        <div style={{ fontSize: '0.65rem', color: '#7a4f01', marginTop: '5px' }}>
          If the current sync payload has the files, Apply Host Assets will use them now. If not, request them from the host.
        </div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={acceptComplianceResolution}
            disabled={!multiplayer.complianceResolution.canApplyFromHostPayload}
            style={{ padding: '5px 8px', fontSize: '0.68rem', border: 'none', borderRadius: '4px', background: '#1976d2', color: '#fff', cursor: 'pointer' }}
          >
            Apply Host Assets
          </button>
          <button
            type="button"
            onClick={requestHostAssets}
            style={{ padding: '5px 8px', fontSize: '0.68rem', border: '1px solid #1976d2', borderRadius: '4px', background: '#fff', color: '#1976d2', cursor: 'pointer' }}
          >
            Request Host Assets
          </button>
          <button
            type="button"
            onClick={declineComplianceResolution}
            disabled={!multiplayer.complianceResolution.canDecline}
            title={multiplayer.complianceResolution.canDecline ? 'Decline this optional sync.' : 'Forced host categories cannot be declined safely yet.'}
            style={{ padding: '5px 8px', fontSize: '0.68rem', border: '1px solid #d0d7de', borderRadius: '4px', background: '#fff', color: '#7a4f01', cursor: multiplayer.complianceResolution.canDecline ? 'pointer' : 'not-allowed', opacity: multiplayer.complianceResolution.canDecline ? 1 : 0.65 }}
          >
            Decline
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="view-container cu-view-shell">
      {!multiplayer.isConnected ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', border: '1px solid #eee', marginBottom: '5px' }}>
            <div style={{ display: 'flex', gap: '9px', alignItems: 'center', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #e5e7eb' }}>
              {localProfile.profileImage ? (
                <img src={localProfile.profileImage} alt="" style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #d0d7de' }} />
              ) : (
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#e0e7ff', color: '#3730a3', display: 'grid', placeItems: 'center', fontSize: '0.72rem', fontWeight: 700, border: '1px solid #c7d2fe' }}>
                  {profileInitials}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{localProfile.displayName || 'Guest Player'}</div>
                <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Local Profile</div>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '8px', color: '#666' }}>Server Source</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', cursor: 'pointer' }}>
                    <input type="radio" name="serverMode" checked={serverConfig.mode === 'home'} onChange={() => updateMultiplayerServer({ mode: 'home' })} />
                    Use My Home Server
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', cursor: 'pointer' }}>
                    <input type="radio" name="serverMode" checked={serverConfig.mode === 'custom'} onChange={() => updateMultiplayerServer({ mode: 'custom' })} />
                    Use Custom Server
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', cursor: 'not-allowed', opacity: 0.6 }} title="Official server infrastructure is in development.">
                    <input type="radio" name="serverMode" checked={serverConfig.mode === 'official'} disabled />
                    Official Server (Coming Later)
                </label>
            </div>

            <div style={{ fontSize: '0.65rem', color: '#888', marginBottom: '4px' }}>Server URL / IP</div>
            <input 
              type="text" 
              value={serverConfig.mode === 'home' ? serverConfig.homeUrl : serverConfig.customUrl} 
              onChange={(e) => updateMultiplayerServer(serverConfig.mode === 'home' ? { homeUrl: e.target.value } : { customUrl: e.target.value })}
              placeholder="localhost"
              style={{ padding: '6px', width: '100%', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box', marginBottom: '8px' }}
            />
            <button 
              onClick={testConnection}
              disabled={testStatus.status === 'testing'}
              style={{ width: '100%', padding: '5px', fontSize: '0.7rem', background: '#fff', border: '1px solid #d0d7de', borderRadius: '4px', cursor: 'pointer' }}
            >
              {testStatus.status === 'testing' ? 'Testing...' : 'Test Connection'}
            </button>
            {testStatus.status !== 'idle' && (
                <div style={{ 
                    marginTop: '8px', padding: '6px', fontSize: '0.65rem', borderRadius: '4px',
                    background: testStatus.status === 'pass' ? '#ecfdf5' : '#fef2f2',
                    color: testStatus.status === 'pass' ? '#065f46' : '#991b1b',
                    border: '1px solid',
                    borderColor: testStatus.status === 'pass' ? '#10b981' : '#ef4444'
                }}>
                    {testStatus.message}
                </div>
            )}
          </div>

          <button 
            onClick={hostLanGame}
            style={{ padding: '10px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Host LAN Game
          </button>

          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #dbeafe' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '6px' }}>Available LAN Games</div>
            <div style={{ fontSize: '0.66rem', color: '#475569', lineHeight: 1.35, marginBottom: '8px' }}>
              {lanStatus.message || 'Scanning for games from other computers on this network.'}
            </div>
            {lanGames.length === 0 ? (
              <div style={{ fontSize: '0.7rem', color: '#64748b', padding: '8px', borderRadius: '6px', background: '#fff', border: '1px dashed #cbd5e1' }}>
                No LAN games found yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {lanGames.map(game => (
                  <div key={game.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'center', padding: '8px', borderRadius: '6px', background: '#fff', border: '1px solid #cbd5e1' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {game.hostDisplayName} - {game.gameModeLabel}
                      </div>
                      <div style={{ fontSize: '0.63rem', color: '#64748b' }}>
                        Room {game.roomId} at {game.hostAddress}:{game.serverPort}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => joinLanGame(game)}
                      style={{ padding: '6px 9px', fontSize: '0.68rem', borderRadius: '5px', border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                    >
                      Join
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: '0.64rem', color: '#64748b', lineHeight: 1.35, marginTop: '8px' }}>
              Both computers must be on the same network. Allow Chess Unleashed through Windows Firewall on private networks. Manual IP join remains available below.
            </div>
          </div>

          <div style={{ borderTop: '1px solid #ddd', marginTop: '10px', paddingTop: '10px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Manual Join Fallback</div>
            <input 
              type="text" 
              value={joinRoomId} 
              onChange={(e) => setJoinRoomId(e.target.value)}
              placeholder="Enter Invite Code"
              style={{ padding: '8px', width: '100%', marginBottom: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }}
            />
            <button 
              onClick={() => { console.log(`[UI] Requesting to join room: "${joinRoomId}"`); joinRoom('', joinRoomId); }}
              style={{ width: '100%', padding: '10px', background: '#2196f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Join Match
            </button>
          </div>
        </div>
      ) : (
        <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #bbdefb', paddingBottom: '5px' }}>
            <div style={{ fontSize: '0.9rem' }}>Room: <strong>{multiplayer.roomId}</strong></div>
            <button 
              onClick={copyRoomLink}
              style={{ fontSize: '0.65rem', padding: '2px 8px', cursor: 'pointer', background: copied ? '#4caf50' : '#2196f3', color: 'white', border: 'none', borderRadius: '4px', transition: 'background 0.3s' }}
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
             <div style={{ fontSize: '0.8rem', color: '#1976d2', fontWeight: 'bold', marginBottom: '5px' }}>
                You: {localProfile.displayName || 'Guest Player'} as {multiplayer.playerColor === 'w' ? 'White' : 'Black'}
             </div>
             <div style={{ fontSize: '0.65rem', color: '#607d8b', marginBottom: '6px', wordBreak: 'break-all' }}>
                Guest ID: {localProfile.guestId}
             </div>
             {isHost && (
               <div style={{ fontSize: '0.66rem', color: '#2563eb', marginBottom: '8px', padding: '7px', borderRadius: '5px', background: '#eff6ff', border: '1px solid #bfdbfe', lineHeight: 1.35 }}>
                 {lanStatus.message || 'Hosting on this network.'}
                 {lanServerInfo?.manualUrl && (
                   <div style={{ marginTop: '4px', color: '#1e40af' }}>
                     Manual fallback: {lanServerInfo.manualUrl} / Room {multiplayer.roomId}
                   </div>
                 )}
               </div>
             )}
             
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>⚪ White Slot:</span>
                <span style={{ color: multiplayer.presence.white ? '#4caf50' : '#f44336', fontWeight: 'bold' }}>
                   {multiplayer.presence.white ? 'Occupied' : 'Waiting...'}
                </span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>⚫ Black Slot:</span>
                <span style={{ color: multiplayer.presence.black ? '#4caf50' : '#f44336', fontWeight: 'bold' }}>
                   {multiplayer.presence.black ? 'Occupied' : 'Waiting...'}
                </span>
             </div>
          </div>

          {/* Match Experience Policy */}
          <div style={{ marginTop: '15px', padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #bbdefb' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '10px', color: '#1976d2' }}>Match Environment</div>
            
            {isHost ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', cursor: 'pointer' }}>
                   <input type="checkbox" checked={multiplayer.enforceSharedExp} onChange={() => onSettingToggle('enforceSharedExp')} />
                   Enforce Shared Experience
                </label>
                {multiplayer.enforceSharedExp && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', cursor: 'pointer', marginLeft: '20px' }}>
                    <input type="checkbox" checked={multiplayer.allowPersonalPieces} onChange={() => onSettingToggle('allowPersonalPieces')} />
                    Allow Guest's own pieces
                  </label>
                )}
                {renderExperienceSyncPolicy(true)}
              </div>
            ) : (
              <div style={{ fontSize: '0.7rem', color: '#666' }}>
                {multiplayer.enforceSharedExp ? (
                  <div>
                    🔒 Environment Locked by Host
                    {multiplayer.allowPersonalPieces && <div style={{ marginTop: '3px', color: '#27ae60' }}>✓ Your custom pieces allowed</div>}
                  </div>
                ) : (
                  "🔓 Independent Experience Active"
                )}
                {renderExperienceSyncPolicy(false)}
                {renderComplianceResolution()}
              </div>
            )}
          </div>

          <div style={{ marginTop: '15px' }}>
            {multiplayer.presence.white && multiplayer.presence.black ? (
              <div>
                {multiplayer.undoRequestPending ? (
                  <div style={{ background: '#fff9c4', padding: '10px', borderRadius: '4px', border: '1px solid #fbc02d', textAlign: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '8px' }}>Opponent requests Undo</div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button onClick={() => handleUndoResponse(true)} style={{ flex: 1, padding: '5px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Accept</button>
                      <button onClick={() => handleUndoResponse(false)} style={{ flex: 1, padding: '5px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Decline</button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={requestUndo}
                    style={{ width: '100%', padding: '6px', background: '#fff', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', marginBottom: '10px' }}
                  >
                    Request Undo
                  </button>
                )}
              </div>
            ) : (
              <div style={{ fontSize: '0.7rem', marginBottom: '10px', color: '#666', textAlign: 'center', fontStyle: 'italic' }}>
                {multiplayer.playerColor === 'w' ? 'Waiting for opponent...' : 'Syncing...'}
              </div>
            )}
          </div>
          
          <button 
            onClick={leaveRoom}
            style={{ width: '100%', marginTop: '15px', padding: '8px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
          >
            Leave Room
          </button>
        </div>
      )}
      <p style={{ fontSize: '0.7rem', color: '#888', marginTop: '15px' }}>
        Note: Ensure your firewall allows connections on port 8080.
      </p>
    </div>
  );
};

export default MultiplayerView;
