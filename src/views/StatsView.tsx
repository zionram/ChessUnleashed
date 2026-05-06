import React from 'react';
import { useGame } from '../context/GameContext';

const StatsView: React.FC = () => {
  const { gameState } = useGame();

  const moveCount = gameState.history.length;
  const turn = gameState.turn === 'w' ? 'White' : 'Black';

  return (
    <div className="view-container cu-view-shell">
      <div className="stats-grid cu-control-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div className="stat-card cu-panel-card">
          <label>Moves</label>
          <div className="stat-value">{moveCount}</div>
        </div>
        <div className="stat-card cu-panel-card">
          <label>Turn</label>
          <div className="stat-value">{turn}</div>
        </div>
        <div className="stat-card stat-card-wide cu-panel-card">
          <label>Status</label>
          <div className="stat-value">{gameState.isCheck ? 'CHECK' : 'Normal'}</div>
        </div>
      </div>

      <style>{`
        .stats-grid .stat-card {
          background: #f8f9fa;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #dee2e6;
        }

        .stats-grid .stat-card label {
          display: block;
          font-size: 0.7rem;
          color: #6c757d;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 6px;
        }

        .stats-grid .stat-value {
          font-size: 1.2rem;
          font-weight: bold;
          color: #2c3e50;
        }

        .stats-grid .stat-card-wide {
          grid-column: 1 / -1;
        }

        .App[data-sidebar-style="glass"] .stats-grid .stat-card,
        .launcher-category-window .stats-grid .stat-card,
        .launcher-embedded-tool .stats-grid .stat-card {
          background: rgba(10, 20, 38, 0.82);
          border: 1px solid rgba(148, 163, 184, 0.16);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
        }

        .App[data-sidebar-style="glass"] .stats-grid .stat-card label,
        .launcher-category-window .stats-grid .stat-card label,
        .launcher-embedded-tool .stats-grid .stat-card label {
          color: #8fa3ba;
        }

        .App[data-sidebar-style="glass"] .stats-grid .stat-value,
        .launcher-category-window .stats-grid .stat-value,
        .launcher-embedded-tool .stats-grid .stat-value {
          color: #dbeafe;
        }

        @media (max-width: 640px) {
          .stats-grid {
            grid-template-columns: 1fr !important;
          }

          .stats-grid .stat-card-wide {
            grid-column: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default StatsView;
