import React from 'react';
import { useGame } from '../context/GameContext';

const AnalysisView: React.FC = () => {
  const { analysis, gameState, multiplayer, analysisPerspective, setAnalysisPerspective } = useGame();

  // Determine effective color for perspective
  const effectiveColor = analysisPerspective === 'you' 
    ? (multiplayer.playerColor || gameState.turn) 
    : analysisPerspective;

  // Flip score if perspective is Black
  const displayScore = effectiveColor === 'b' ? -analysis.evaluation : analysis.evaluation;

  const evalText = displayScore > 0 
    ? `+${displayScore.toFixed(1)}` 
    : displayScore.toFixed(1);

  const perspectiveLabel = effectiveColor === 'w' ? "White's Perspective" : "Black's Perspective";

  return (
    <div className="view-container">
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '10px' }}>
        <select 
          value={analysisPerspective} 
          onChange={(e) => setAnalysisPerspective(e.target.value as any)}
          style={{ fontSize: '0.7rem', padding: '2px' }}
        >
          <option value="you">Your Side</option>
          <option value="w">White</option>
          <option value="b">Black</option>
        </select>
      </div>

      <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
        <div style={{ marginBottom: '15px' }}>
          <div style={{ fontSize: '0.65rem', color: '#6c757d', textTransform: 'uppercase', letterSpacing: '1px' }}>{perspectiveLabel}</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: displayScore >= 0 ? '#27ae60' : '#e74c3c' }}>
            {evalText}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
            {displayScore > 0 ? 'Position is better' : displayScore < 0 ? 'Position is worse' : 'Equal position'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.65rem', color: '#6c757d', textTransform: 'uppercase', letterSpacing: '1px' }}>Engine Best Line</div>
          {analysis.topLines.length > 0 ? (
            <div style={{ marginTop: '5px' }}>
               <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{analysis.topLines[0].san || `${analysis.topLines[0].move.from}-${analysis.topLines[0].move.to}`}</div>
               <div style={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>
                  {(analysis.topLines[0].line || []).slice(1).map((m) => `${m.from}-${m.to}`).join(' ')}
               </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '5px' }}>N/A</div>
          )}
        </div>
      </div>
      
      <p style={{ fontSize: '0.65rem', color: '#888', marginTop: '10px', fontStyle: 'italic' }}>
        Positive (+) means better for the selected perspective.
      </p>
    </div>
  );
};

export default AnalysisView;
