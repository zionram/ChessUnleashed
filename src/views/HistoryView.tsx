import React from 'react';
import { useGame } from '../context/GameContext';
import { useSettings } from '../context/SettingsContext';

const HistoryView: React.FC = () => {
  const { gameState, historyIndex, navigateToHistory, isViewingCurrent, undoMove, multiplayer } = useGame();
  const { settings } = useSettings();
  const { localProfile } = settings;

  const canUndo = (gameState.history?.length || 0) > 0;

  const getPlayerName = (color: 'w' | 'b') => {
    if (multiplayer.vsComputer) {
      if (color === multiplayer.computerSide) return multiplayer.opponentProfile.name;
      return localProfile.displayName || 'Guest Player';
    }
    if (multiplayer.isConnected) {
      if (color === multiplayer.playerColor) return localProfile.displayName || 'Guest Player';
      return color === 'w' ? 'White' : 'Black';
    }
    if (color === 'w') return localProfile.displayName || 'Guest Player';
    return 'Local Player';
  };

  const getPlayerAvatar = (color: 'w' | 'b') => {
    if (multiplayer.vsComputer) {
      if (color === multiplayer.computerSide) return <span style={{ fontSize: '1.2rem' }}>{multiplayer.opponentProfile.avatar}</span>;
      return localProfile.profileImage ? <img src={localProfile.profileImage} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} /> : <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#e0e7ff', display: 'grid', placeItems: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>{(localProfile.displayName || 'G')[0].toUpperCase()}</div>;
    }
    if (multiplayer.isConnected && color === multiplayer.playerColor) {
      return localProfile.profileImage ? <img src={localProfile.profileImage} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} /> : <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#e0e7ff', display: 'grid', placeItems: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>{(localProfile.displayName || 'G')[0].toUpperCase()}</div>;
    }
    return <div style={{ width: 24, height: 24, borderRadius: '50%', background: color === 'w' ? '#fff' : '#333', border: '1px solid #ddd' }} />;
  };

  return (
    <div className="view-container">
      <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
            {getPlayerAvatar('w')}
            <span style={{ fontSize: '0.75rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getPlayerName('w')}</span>
          </div>
          <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8' }}>VS</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getPlayerName('b')}</span>
            {getPlayerAvatar('b')}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '10px' }}>
        <button 
          onClick={undoMove} 
          disabled={!canUndo}
          style={{ fontSize: '0.8rem', padding: '2px 10px', cursor: canUndo ? 'pointer' : 'not-allowed' }}
        >
          Undo Move
        </button>
      </div>

      <div className="history-controls" style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
        <button onClick={() => navigateToHistory(0)}>«</button>
        <button onClick={() => navigateToHistory(Math.max(0, historyIndex === -1 ? (gameState.history?.length || 1) - 1 : historyIndex - 1))}>‹</button>
        <button onClick={() => navigateToHistory(-1)}>Current</button>
        <button onClick={() => navigateToHistory(Math.min(gameState.history?.length || 0, (historyIndex === -1 ? (gameState.history?.length || 0) : historyIndex) + 1))}>›</button>
        <button onClick={() => navigateToHistory(gameState.history?.length || 0)}>»</button>
      </div>

      <div className="history-list" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', padding: '5px' }}>
        {(gameState.history?.length || 0) === 0 && <div>No moves yet</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
          {(gameState.history || []).map((move, i) => (
            <div
              key={i}
              onClick={() => navigateToHistory(i + 1)}
              style={{
                cursor: 'pointer',
                padding: '2px 5px',
                backgroundColor: (historyIndex === i + 1) ? '#ffeb3b' : 'transparent',
                borderRadius: '3px'
              }}
            >
              {Math.floor(i / 2) + 1}. {move}
            </div>
          ))}
        </div>
      </div>
      
      {!isViewingCurrent && (
        <div style={{ marginTop: '10px', color: '#f44336', fontSize: '0.8rem', fontWeight: 'bold' }}>
          Viewing Past State
        </div>
      )}
    </div>
  );
};

export default HistoryView;
