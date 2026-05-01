import React from 'react';
import { useGame } from '../context/GameContext';

const StatsView: React.FC = () => {
  const { gameState } = useGame();
  
  const moveCount = gameState.history.length;
  const turn = gameState.turn === 'w' ? 'White' : 'Black';

  return (
    <div className="view-container">
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div className="stat-card">
          <label>Moves</label>
          <div className="stat-value">{moveCount}</div>
        </div>
        <div className="stat-card">
          <label>Turn</label>
          <div className="stat-value">{turn}</div>
        </div>
        <div className="stat-card">
          <label>Status</label>
          <div className="stat-value">{gameState.isCheck ? 'CHECK' : 'Normal'}</div>
        </div>
      </div>
      
      <style>{`
        .stat-card {
          background: #f8f9fa;
          padding: 10px;
          border-radius: 4px;
          border: 1px solid #dee2e6;
        }
        .stat-card label {
          font-size: 0.7rem;
          color: #6c757d;
          text-transform: uppercase;
        }
        .stat-value {
          font-size: 1.2rem;
          font-weight: bold;
          color: #2c3e50;
        }
      `}</style>
    </div>
  );
};

export default StatsView;
