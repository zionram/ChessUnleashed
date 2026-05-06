import React from 'react';
import { SettingsFieldRenderer } from '../components/settings/SettingsFieldRenderer';
import { useSettings } from '../context/SettingsContext';
import { getRegisteredSettingsField } from '../registry/SettingsRegistry';

const positionField = getRegisteredSettingsField('chat.position');
const lineCountField = getRegisteredSettingsField('chat.lineCount');
const fontFamilyField = getRegisteredSettingsField('chat.fontFamily');
const fontSizeField = getRegisteredSettingsField('chat.fontSize');
const messageSpacingField = getRegisteredSettingsField('chat.messageSpacing');

const ChatSettingsView: React.FC = () => {
  const { settings, updateChatSettings } = useSettings();
  const { position, lineCount, style } = settings.chatSettings;
  const fontOptions = fontFamilyField?.options ?? [
    { label: 'System', value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Courier New', value: "'Courier New', monospace" }
  ];

  return (
    <div className="view-container cu-view-shell">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <SettingsFieldRenderer
          fieldKey={positionField?.id}
          type="select"
          label={positionField?.label ?? 'Position'}
          value={position}
          onChange={(value) => updateChatSettings({ position: value as 'right' | 'bottom' | 'floating' })}
          options={positionField?.options ?? [
              { label: 'Right Panel', value: 'right' },
              { label: 'Bottom Bar', value: 'bottom' },
              { label: 'Floating', value: 'floating' }
            ]}
        />
        <SettingsFieldRenderer
          fieldKey={lineCountField?.id}
          type="range"
          label={`${lineCountField?.label ?? 'Line Count'} (${lineCount})`}
          value={lineCount}
          onChange={(value) => updateChatSettings({ lineCount: Number(value) })}
          min={1}
          max={10}
          step={1}
          width="100px"
        />
        <SettingsFieldRenderer
          fieldKey={fontFamilyField?.id}
          type="select"
          label={fontFamilyField?.label ?? 'Font'}
          value={style.fontFamily}
          onChange={(value) => updateChatSettings({ style: { ...style, fontFamily: String(value) } })}
          options={fontOptions}
        />
        <SettingsFieldRenderer
          fieldKey={fontSizeField?.id}
          type="range"
          label={`${fontSizeField?.label ?? 'Font Size'} (${style.fontSize}px)`}
          value={style.fontSize}
          onChange={(value) => updateChatSettings({ style: { ...style, fontSize: Number(value) } })}
          min={10}
          max={20}
          step={1}
          width="100px"
        />
        <SettingsFieldRenderer
          fieldKey={messageSpacingField?.id}
          type="range"
          label={`${messageSpacingField?.label ?? 'Spacing'} (${style.messageSpacing}px)`}
          value={style.messageSpacing}
          onChange={(value) => updateChatSettings({ style: { ...style, messageSpacing: Number(value) } })}
          min={2}
          max={16}
          step={1}
          width="100px"
        />
      </div>
      <p style={{ fontSize: '0.7rem', color: '#666', marginTop: '10px' }}>
        Configure where chat messages are displayed and how much vertical space they occupy.
      </p>
    </div>
  );
};

export default ChatSettingsView;
