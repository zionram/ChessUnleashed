import React, { useState } from 'react';
import { useGame, type AIDifficulty } from '../context/GameContext';
import { useSettings, type BotChatTrigger, type BotPersonality, type BotPersonalityProfile, type BotSettings, type EngineId } from '../context/SettingsContext';
import type { EngineCapabilities } from '../engines/EngineAdapter';

const DEFAULT_ENGINE_CAPABILITIES: EngineCapabilities = {
  supportsDifficulty: true,
  supportsDepth: true,
  supportsMultiPV: true,
  supportsPersonality: true,
  supportsMoveExplanation: true
};

const AVATARS = ['\u{1F916}', '\u{1F9E0}', '\u{2699}\u{FE0F}', '\u{1F47E}', '\u{265F}\u{FE0F}', '\u{265B}', '\u{265A}', '\u{1F9D9}', '\u{1F480}', '\u{1F642}'];

const ComputerOpponentView: React.FC = () => {
  const { engine, multiplayer, ficsGame, setAIDifficulty, startVsComputer, setOpponentProfile, gameStartError, botRuntimeStatus } = useGame();
  const { settings, updateBotSettings, updatePersonalityProfile, renamePersonalityProfile, createPersonalityProfile, setActiveEngineId } = useSettings();
  const { opponentProfile: op } = multiplayer;
  const { botSettings } = settings;
  const capabilities = engine.capabilities ?? DEFAULT_ENGINE_CAPABILITIES;
  const currentProfile = settings.personalityProfiles[botSettings.personality];
  const profileSettings = currentProfile?.settings || botSettings;
  const traitEntries = Object.entries(profileSettings.personalityTraits) as [keyof BotSettings['personalityTraits'], number][];
  const chatTriggers: BotChatTrigger[] = ['gameStart', 'botCapture', 'botCaptured', 'check', 'checkmate', 'draw'];
  const [isEditingPersonality, setIsEditingPersonality] = useState(false);
  const isOnlineGameActive = !!ficsGame || multiplayer.isConnected || !!multiplayer.roomId;

  const difficulties: AIDifficulty[] = [
    'Easy', 'Casual', 'Intermediate', 'Advanced', 'Expert', 'Master', 'Grandmaster'
  ];
  const personalities = Object.keys(settings.personalityProfiles) as BotPersonality[];
  const engineOptions: { id: EngineId; label: string }[] = settings.registeredBots.map(bot => ({
    id: bot.id,
    label: bot.type === 'mock' ? bot.name : `${bot.name} (browser engine)`
  }));

  const updateCurrentProfile = (updates: Partial<BotPersonalityProfile>) => {
    if (currentProfile) updatePersonalityProfile(currentProfile.name, updates);
  };
  const updateCurrentProfileSettings = (updates: Partial<Omit<BotSettings, 'personality'>>) => {
    if (!currentProfile) return;
    const nextSettings = { ...currentProfile.settings, ...updates };
    updatePersonalityProfile(currentProfile.name, { settings: nextSettings });
    updateBotSettings(updates);
  };
  const createCustomProfile = () => {
    if (!currentProfile) return null;
    let index = 1;
    let name = `${currentProfile.name} Custom`;
    while (settings.personalityProfiles[name]) {
      index += 1;
      name = `${currentProfile.name} Custom ${index}`;
    }
    createPersonalityProfile(currentProfile.name, name);
    updateBotSettings({ personality: name, ...currentProfile.settings });
    setIsEditingPersonality(true);
    return name;
  };
  const editSelectedProfile = () => {
    if (!currentProfile) return;
    if (currentProfile.builtin) createCustomProfile();
    else setIsEditingPersonality(true);
  };
  const saveSelectedProfile = () => {
    if (currentProfile) updateBotSettings({ personality: currentProfile.name, ...currentProfile.settings });
    setIsEditingPersonality(false);
  };

  const renderBotRuntimeStatus = () => {
    if (botRuntimeStatus.state === 'idle') return null;
    return (
      <div style={{
        marginTop: '10px',
        padding: '8px',
        borderRadius: '6px',
        fontSize: '0.72rem',
        border: '1px solid',
        borderColor: botRuntimeStatus.state === 'failed' ? '#fecaca' : botRuntimeStatus.state === 'thinking' ? '#fde68a' : '#86efac',
        background: botRuntimeStatus.state === 'failed' ? '#fef2f2' : botRuntimeStatus.state === 'thinking' ? '#fffbeb' : '#f0fdf4',
        color: botRuntimeStatus.state === 'failed' ? '#991b1b' : botRuntimeStatus.state === 'thinking' ? '#92400e' : '#166534'
      }}>
        {botRuntimeStatus.message}
      </div>
    );
  };

  return (
    <div className="view-container cu-view-shell">
      <div style={{ marginBottom: '15px', padding: '15px', background: '#2c3e50', borderRadius: '10px', color: 'white', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '5px' }}>{op.avatar || '\u{1F916}'}</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{op.name}</div>
        <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '5px' }}>Strength: {botSettings.difficulty}</div>
        <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: '3px' }}>Bot: {settings.registeredBots.find(bot => bot.id === settings.activeEngineId)?.name ?? engine.name}</div>
      </div>

      {!multiplayer.vsComputer ? (
        <div style={{ marginBottom: '20px', padding: '15px', background: isOnlineGameActive ? '#f8fafc' : '#e3f2fd', borderRadius: '8px', border: isOnlineGameActive ? '1px solid #94a3b8' : '1px solid #2196f3' }}>
          <h4 style={{ margin: '0 0 10px 0', color: isOnlineGameActive ? '#475569' : '#1976d2', textAlign: 'center' }}>Start New Match</h4>
          {isOnlineGameActive && (
            <div style={{ marginBottom: '10px', color: '#475569', fontSize: '0.75rem', textAlign: 'center' }}>
              Computer opponent is disabled during online games.
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => startVsComputer('w')}
              disabled={isOnlineGameActive}
              style={{ flex: 1, padding: '10px', background: '#fff', border: '2px solid #2c3e50', color: '#2c3e50', borderRadius: '4px', cursor: isOnlineGameActive ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: isOnlineGameActive ? 0.55 : 1 }}
            >
              Play as White
            </button>
            <button
              onClick={() => startVsComputer('b')}
              disabled={isOnlineGameActive}
              style={{ flex: 1, padding: '10px', background: '#2c3e50', color: 'white', border: 'none', borderRadius: '4px', cursor: isOnlineGameActive ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: isOnlineGameActive ? 0.55 : 1 }}
            >
              Play as Black
            </button>
          </div>
          {gameStartError && (
            <div style={{ marginTop: '10px', color: '#c0392b', fontSize: '0.75rem', textAlign: 'center' }}>
              {gameStartError}
            </div>
          )}
        </div>
      ) : (
        <div style={{ marginBottom: '20px', padding: '8px', background: '#f1f8e9', color: '#2e7d32', borderRadius: '8px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
          Match in progress
        </div>
      )}

      <section style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '0.85rem', marginBottom: '8px', color: '#666' }}>Engine</h4>
        <select
          value={settings.activeEngineId}
          onChange={(e) => setActiveEngineId(e.target.value as EngineId)}
          style={{ width: '100%', padding: '6px', fontSize: '0.75rem' }}
        >
          {engineOptions.map(option => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
        {renderBotRuntimeStatus()}
      </section>

      {capabilities.supportsDifficulty && (
        <section style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '0.85rem', marginBottom: '8px', color: '#666' }}>Engine Strength</h4>
          <select
            value={botSettings.difficulty}
            onChange={(e) => setAIDifficulty(e.target.value as AIDifficulty)}
            style={{ width: '100%', padding: '6px', fontSize: '0.75rem' }}
          >
            {difficulties.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </section>
      )}

      <section style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '0.85rem', marginBottom: '5px', color: '#666' }}>Identity & Speed</h4>
        <input
          value={op.name}
          onChange={(e) => setOpponentProfile({ name: e.target.value })}
          placeholder="Opponent Name"
          style={{ width: '100%', padding: '6px', marginBottom: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', fontSize: '0.75rem' }}
        />
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '10px' }}>
          {AVATARS.map(a => (
            <button
              key={a}
              onClick={() => setOpponentProfile({ avatar: a })}
              style={{ fontSize: '1rem', padding: '3px', background: op.avatar === a ? '#e3f2fd' : '#fff', border: op.avatar === a ? '1.5px solid #2196f3' : '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}
            >
              {a}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.65rem', color: '#888', whiteSpace: 'nowrap' }}>Speed ({botSettings.thinkTime}ms)</span>
          <input
            type="range" min="0" max="5000" step="100"
            value={botSettings.thinkTime}
            onChange={(e) => updateBotSettings({ thinkTime: parseInt(e.target.value) })}
            style={{ flex: 1, cursor: 'pointer' }}
          />
        </div>
      </section>

      <section style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '0.85rem', marginBottom: '8px', color: '#666' }}>Bot Settings</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {capabilities.supportsPersonality && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.65rem', color: '#888', width: '110px' }}>Personality</span>
              <select
                value={botSettings.personality}
                onChange={(e) => {
                  const personality = e.target.value as BotPersonality;
                  const profile = settings.personalityProfiles[personality];
                  if (profile) updateBotSettings({ personality, ...profile.settings });
                }}
                style={{ flex: 1, padding: '5px', fontSize: '0.75rem' }}
              >
                {personalities.map(personality => (
                  <option key={personality} value={personality}>{personality}</option>
                ))}
              </select>
            </label>
          )}
          {capabilities.supportsDepth && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.65rem', color: '#888', width: '110px' }}>Depth ({botSettings.depth})</span>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={botSettings.depth}
                onChange={(e) => updateBotSettings({ depth: parseInt(e.target.value) })}
                style={{ flex: 1, cursor: 'pointer' }}
              />
            </label>
          )}
          {capabilities.supportsPersonality && (
            <>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.65rem', color: '#888', width: '110px' }}>Randomness ({botSettings.randomness.toFixed(1)})</span>
                <input type="range" min="0" max="1" step="0.1" value={botSettings.randomness} onChange={(e) => updateBotSettings({ randomness: parseFloat(e.target.value) })} style={{ flex: 1, cursor: 'pointer' }} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.65rem', color: '#888', width: '110px' }}>Capture ({botSettings.capturePriority.toFixed(1)})</span>
                <input type="range" min="0" max="3" step="0.1" value={botSettings.capturePriority} onChange={(e) => updateBotSettings({ capturePriority: parseFloat(e.target.value) })} style={{ flex: 1, cursor: 'pointer' }} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.65rem', color: '#888', width: '110px' }}>Check ({botSettings.checkPriority.toFixed(1)})</span>
                <input type="range" min="0" max="3" step="0.1" value={botSettings.checkPriority} onChange={(e) => updateBotSettings({ checkPriority: parseFloat(e.target.value) })} style={{ flex: 1, cursor: 'pointer' }} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: '#666' }}>
                <input type="checkbox" checked={botSettings.avoidRepetition} onChange={(e) => updateBotSettings({ avoidRepetition: e.target.checked })} />
                Avoid repeated moves
              </label>
            </>
          )}
          {capabilities.supportsMoveExplanation && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: '#666' }}>
              <input type="checkbox" checked={botSettings.showMoveExplanation} onChange={(e) => updateBotSettings({ showMoveExplanation: e.target.checked })} />
              Show move explanation
            </label>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: '#666' }}>
            <input type="checkbox" checked={botSettings.botChatEnabled} onChange={(e) => updateBotSettings({ botChatEnabled: e.target.checked })} />
            Bot Chat: {botSettings.botChatEnabled ? 'On' : 'Off'}
          </label>
        </div>
      </section>

      {capabilities.supportsPersonality && (
        <section style={{ padding: '12px', background: 'rgba(52, 152, 219, 0.05)', borderRadius: '8px', border: '1px dashed #3498db' }}>
          <h4 style={{ fontSize: '0.8rem', marginBottom: '5px', color: '#2980b9' }}>AI Personality</h4>
          <div style={{ fontSize: '0.7rem', color: '#666' }}>
            <input
              key={currentProfile?.name || botSettings.personality}
              defaultValue={currentProfile?.name || botSettings.personality}
              onBlur={(e) => currentProfile && isEditingPersonality && !currentProfile.builtin && renamePersonalityProfile(currentProfile.name, e.target.value)}
              readOnly={!isEditingPersonality || currentProfile?.builtin}
              style={{ width: '100%', padding: '5px', marginBottom: '6px', fontSize: '0.75rem', boxSizing: 'border-box' }}
            />
            <textarea
              value={currentProfile?.description || ''}
              onChange={(e) => updateCurrentProfile({ description: e.target.value })}
              readOnly={!isEditingPersonality}
              rows={2}
              style={{ width: '100%', padding: '5px', marginBottom: '8px', fontSize: '0.7rem', boxSizing: 'border-box', resize: 'vertical' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px', marginBottom: '8px' }}>
              <button onClick={createCustomProfile} style={{ padding: '5px', fontSize: '0.65rem', cursor: 'pointer' }}>
                New Custom Personality
              </button>
              <button onClick={editSelectedProfile} style={{ padding: '5px', fontSize: '0.65rem', cursor: 'pointer' }}>
                Edit Selected Personality
              </button>
              <button onClick={saveSelectedProfile} disabled={!isEditingPersonality} style={{ padding: '5px', fontSize: '0.65rem', cursor: isEditingPersonality ? 'pointer' : 'not-allowed' }}>
                Save Personality
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
              {traitEntries.map(([trait, value]) => (
                <label key={trait} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', textTransform: 'capitalize' }}>
                    {trait}<strong>{Math.round(value * 100)}%</strong>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={value}
                    disabled={!isEditingPersonality}
                    onChange={(e) => updateCurrentProfileSettings({
                      personalityTraits: {
                        ...profileSettings.personalityTraits,
                        [trait]: parseFloat(e.target.value)
                      }
                    })}
                  />
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
              {chatTriggers.map(trigger => (
                <label key={trigger} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ textTransform: 'capitalize' }}>{trigger}</span>
                  <input
                    value={(currentProfile?.chatReactions[trigger] || []).join(' | ')}
                    disabled={!isEditingPersonality}
                    onChange={(e) => currentProfile && updateCurrentProfile({
                      chatReactions: {
                        ...currentProfile.chatReactions,
                        [trigger]: e.target.value.split('|').map(line => line.trim()).filter(Boolean)
                      }
                    })}
                    style={{ padding: '4px', fontSize: '0.7rem' }}
                  />
                </label>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default ComputerOpponentView;
