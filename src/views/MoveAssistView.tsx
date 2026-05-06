import React from 'react';
import { useSettings } from '../context/SettingsContext';

const MoveAssistView: React.FC = () => {
  const { settings, setTrainingWheels, updateMoveAssistSettings } = useSettings();
  const moveAssist = settings.moveAssistSettings;

  return (
    <div className="view-container cu-view-shell cu-move-assist-view cu-stack">
      <div className="cu-row-between">
        <div>
          <h3 className="cu-view-title cu-no-margin">Move Assist</h3>
          <p className="cu-help-text">Configure board assistance, pressure badges, and custom-piece hover helpers.</p>
        </div>
      </div>

      <section className="cu-panel-card cu-pad cu-stack-sm">
        <div className="cu-section-title">Board Assistance</div>
        <label className="cu-checkbox-row">
          <input
            type="checkbox"
            checked={settings.trainingWheels}
            onChange={(e) => setTrainingWheels(e.target.checked)}
          />
          <span>Show move assist badges and pressure hints on the board</span>
        </label>
        <p className="cu-help-text">This controls the numbered attack/defense badges and board-side assist overlay.</p>
      </section>

      <section className="cu-panel-card cu-pad cu-stack-sm">
        <div className="cu-section-title">Custom Piece Hover Helpers</div>
        <label className="cu-checkbox-row">
          <input
            type="checkbox"
            checked={moveAssist.hoverPieceIdentity}
            onChange={(e) => updateMoveAssistSettings({ hoverPieceIdentity: e.target.checked })}
          />
          <span>Show standard piece icon in the square corner on hover</span>
        </label>
        <label className="cu-checkbox-row">
          <input
            type="checkbox"
            checked={moveAssist.hoverPieceIdentityOnlineOnly}
            disabled={!moveAssist.hoverPieceIdentity}
            onChange={(e) => updateMoveAssistSettings({ hoverPieceIdentityOnlineOnly: e.target.checked })}
          />
          <span>Only show the hover identity icon during online games</span>
        </label>
        <label className="cu-checkbox-row">
          <input
            type="checkbox"
            checked={moveAssist.hoverPieceGlow}
            onChange={(e) => updateMoveAssistSettings({ hoverPieceGlow: e.target.checked })}
          />
          <span>Glow piece edges on hover</span>
        </label>
        <p className="cu-help-text">The identity marker is a small standard chess symbol, such as ♘ or ♝, shown in the upper-left corner of the square.</p>
      </section>
    </div>
  );
};

export default MoveAssistView;
