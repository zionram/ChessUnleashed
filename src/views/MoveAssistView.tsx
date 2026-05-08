import React from 'react';
import { useSettings } from '../context/SettingsContext';

type AssistOptionCardProps = {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  preview: React.ReactNode;
};

const previewShellStyle: React.CSSProperties = {
  width: 116,
  minWidth: 116,
  height: 84,
  borderRadius: 14,
  border: '1px solid rgba(96, 165, 250, 0.24)',
  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.78))',
  display: 'grid',
  placeItems: 'center',
  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.06)',
  overflow: 'hidden'
};

const miniBoardStyle: React.CSSProperties = {
  width: 58,
  height: 58,
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gridTemplateRows: 'repeat(2, 1fr)',
  borderRadius: 8,
  overflow: 'hidden',
  border: '1px solid rgba(226, 232, 240, 0.18)',
  position: 'relative'
};

const TogglePreview: React.FC<{ type: 'badges' | 'identity' | 'online' | 'glow' }> = ({ type }) => {
  if (type === 'glow') {
    return (
      <div style={previewShellStyle} aria-hidden="true">
        <div style={{ position: 'relative', width: 58, height: 58, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'rgba(15, 23, 42, 0.82)' }}>
          <div style={{ position: 'absolute', inset: 6, borderRadius: 12, boxShadow: '0 0 18px rgba(56, 189, 248, 0.9), inset 0 0 12px rgba(56, 189, 248, 0.28)' }} />
          <span style={{ fontSize: 34, lineHeight: 1, filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.45))' }}>♞</span>
        </div>
      </div>
    );
  }

  if (type === 'identity') {
    return (
      <div style={previewShellStyle} aria-hidden="true">
        <div style={miniBoardStyle}>
          <div style={{ background: 'rgba(15, 23, 42, 0.95)' }} />
          <div style={{ background: 'rgba(71, 85, 105, 0.72)', position: 'relative', display: 'grid', placeItems: 'center' }}>
            <span style={{ position: 'absolute', top: 3, left: 4, fontSize: 13, color: '#dbeafe', fontWeight: 800 }}>♘</span>
            <span style={{ fontSize: 25 }}>🐉</span>
          </div>
          <div style={{ background: 'rgba(71, 85, 105, 0.72)' }} />
          <div style={{ background: 'rgba(15, 23, 42, 0.95)' }} />
        </div>
      </div>
    );
  }

  if (type === 'online') {
    return (
      <div style={previewShellStyle} aria-hidden="true">
        <div style={{ display: 'grid', gap: 7, justifyItems: 'center' }}>
          <div style={{ fontSize: 21 }}>🌐</div>
          <div style={{ width: 70, height: 8, borderRadius: 99, background: 'rgba(56, 189, 248, 0.34)' }} />
          <div style={{ width: 46, height: 8, borderRadius: 99, background: 'rgba(148, 163, 184, 0.28)' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={previewShellStyle} aria-hidden="true">
      <div style={miniBoardStyle}>
        <div style={{ background: 'rgba(15, 23, 42, 0.95)' }} />
        <div style={{ background: 'rgba(71, 85, 105, 0.72)', position: 'relative' }}>
          <span style={{ position: 'absolute', right: 3, top: 3, minWidth: 18, height: 18, borderRadius: 99, background: 'rgba(14, 165, 233, 0.95)', color: '#eff6ff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 900 }}>2</span>
        </div>
        <div style={{ background: 'rgba(71, 85, 105, 0.72)', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 3, bottom: 3, minWidth: 18, height: 18, borderRadius: 99, background: 'rgba(248, 113, 113, 0.95)', color: '#fff1f2', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 900 }}>1</span>
        </div>
        <div style={{ background: 'rgba(15, 23, 42, 0.95)', display: 'grid', placeItems: 'center', fontSize: 23 }}>♕</div>
      </div>
    </div>
  );
};

const AssistOptionCard: React.FC<AssistOptionCardProps> = ({ title, description, checked, onChange, disabled, preview }) => (
  <label
    className="cu-panel-card cu-move-assist-option"
    style={{
      display: 'flex',
      gap: 16,
      alignItems: 'center',
      padding: 14,
      opacity: disabled ? 0.58 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer'
    }}
  >
    {preview}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 800, color: 'inherit', marginBottom: 5 }}>{title}</div>
      <div className="cu-help-text" style={{ margin: 0 }}>{description}</div>
    </div>
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      style={{ width: 18, height: 18, accentColor: '#38bdf8' }}
    />
  </label>
);

const MoveAssistView: React.FC = () => {
  const { settings, setTrainingWheels, updateMoveAssistSettings } = useSettings();
  const moveAssist = settings.moveAssistSettings;

  return (
    <div className="view-container cu-view-shell cu-move-assist-view cu-stack" style={{ padding: 18 }}>
      <div className="cu-row-between">
        <div>
          <h3 className="cu-view-title cu-no-margin">Move Assist</h3>
          <p className="cu-help-text">Configure board assistance, pressure badges, and custom-piece hover helpers.</p>
        </div>
      </div>

      <section className="cu-stack-sm">
        <div className="cu-section-title">Board Assistance</div>
        <AssistOptionCard
          title="Show move assist badges"
          description="Displays numbered attack and defense badges plus pressure hints directly on the board."
          checked={settings.trainingWheels}
          onChange={setTrainingWheels}
          preview={<TogglePreview type="badges" />}
        />
        <AssistOptionCard
          title="Show board-side assist window"
          description="Shows or hides the floating engine assist panel beside the board while keeping move badges separately controlled."
          checked={moveAssist.showEngineAssistPanel ?? true}
          disabled={!settings.trainingWheels}
          onChange={(checked) => updateMoveAssistSettings({ showEngineAssistPanel: checked })}
          preview={<TogglePreview type="badges" />}
        />
      </section>

      <section className="cu-stack-sm">
        <div className="cu-section-title">Custom Piece Hover Helpers</div>
        <AssistOptionCard
          title="Show standard piece icon on hover"
          description="Shows a small standard chess symbol, such as ♘ or ♝, in the square corner when custom pieces are hard to identify."
          checked={moveAssist.hoverPieceIdentity}
          onChange={(checked) => updateMoveAssistSettings({ hoverPieceIdentity: checked })}
          preview={<TogglePreview type="identity" />}
        />
        <AssistOptionCard
          title="Only show identity icons during online games"
          description="Keeps the helper hidden in local play, but shows it during online games where custom piece clarity matters most."
          checked={moveAssist.hoverPieceIdentityOnlineOnly}
          disabled={!moveAssist.hoverPieceIdentity}
          onChange={(checked) => updateMoveAssistSettings({ hoverPieceIdentityOnlineOnly: checked })}
          preview={<TogglePreview type="online" />}
        />
        <AssistOptionCard
          title="Glow piece edges on hover"
          description="Adds a hover glow around pieces so the focused piece is easier to see before moving."
          checked={moveAssist.hoverPieceGlow}
          onChange={(checked) => updateMoveAssistSettings({ hoverPieceGlow: checked })}
          preview={<TogglePreview type="glow" />}
        />
      </section>
    </div>
  );
};

export default MoveAssistView;
