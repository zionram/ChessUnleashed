import React from 'react';
import { useGame } from '../context/GameContext';

const AnalysisView: React.FC = () => {
  const { analysis, gameState, multiplayer, analysisPerspective, setAnalysisPerspective } = useGame();
  const effectiveColor = analysisPerspective === 'you'
    ? (multiplayer.playerColor || gameState.turn)
    : analysisPerspective;

  const displayScore = effectiveColor === 'b' ? -analysis.evaluation : analysis.evaluation;
  const evalText = displayScore > 0 ? `+${displayScore.toFixed(1)}` : displayScore.toFixed(1);
  const perspectiveLabel = effectiveColor === 'w' ? "White's Perspective" : "Black's Perspective";
  const bestLine = analysis.topLines[0];

  return (
    <div className="view-container cu-view-shell cu-move-assist-view cu-stack">
      <div className="cu-row-between">
        <div>
          <h3 className="cu-view-title cu-no-margin">Move Assist</h3>
          <p className="cu-help-text">Engine evaluation, recommended line, and optional board hover helpers.</p>
        </div>
        <select
          className="cu-select cu-move-assist-select"
          value={analysisPerspective}
          onChange={(e) => setAnalysisPerspective(e.target.value as any)}
          aria-label="Move assist perspective"
        >
          <option value="you">Your Side</option>
          <option value="w">White</option>
          <option value="b">Black</option>
        </select>
      </div>

      <section className="cu-panel-card cu-pad cu-stack-sm">
        <div className="cu-section-header">
          <div>
            <div className="cu-section-title">{perspectiveLabel}</div>
            <p className="cu-section-subtitle">Positive means better for the selected perspective.</p>
          </div>
          <div className={displayScore >= 0 ? 'cu-assist-score is-good' : 'cu-assist-score is-bad'}>
            {evalText}
          </div>
        </div>
        <div className="cu-muted cu-small">
          {displayScore > 0 ? 'Position is better' : displayScore < 0 ? 'Position is worse' : 'Equal position'}
        </div>
      </section>

      <section className="cu-panel-card cu-pad cu-stack-sm">
        <div className="cu-section-title">Engine Best Line</div>
        {bestLine ? (
          <div className="cu-card-muted cu-pad-sm cu-stack-sm">
            <div className="cu-strong">{bestLine.san || `${bestLine.move.from}-${bestLine.move.to}`}</div>
            <div className="cu-muted cu-small">
              {(bestLine.line || []).slice(1).map((m) => `${m.from}-${m.to}`).join(' ') || 'No continuation available.'}
            </div>
          </div>
        ) : (
          <div className="cu-empty-state">No engine line available yet.</div>
        )}
      </section>
    </div>
  );
};

export default AnalysisView;
