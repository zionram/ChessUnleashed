import React, { useEffect, useMemo, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { getRegisteredSettingsField } from '../registry/SettingsRegistry';

const lineCountField = getRegisteredSettingsField('chat.lineCount');
const fontFamilyField = getRegisteredSettingsField('chat.fontFamily');
const fontSizeField = getRegisteredSettingsField('chat.fontSize');
const messageSpacingField = getRegisteredSettingsField('chat.messageSpacing');

type ChatStyleDraft = {
  fontFamily: string;
  fontSize: number;
  messageSpacing: number;
  transparent: boolean;
  textColor: string;
  selfTextColor: string;
  otherTextColor: string;
  systemTextColor: string;
  backgroundColor: string;
  selfBubbleColor: string;
  otherBubbleColor: string;
  systemBubbleColor: string;
  defaultBubbleColor: string;
  selfBubbleTransparent: boolean;
  otherBubbleTransparent: boolean;
  systemBubbleTransparent: boolean;
  defaultBubbleTransparent: boolean;
  selfFontFamily: string;
  otherFontFamily: string;
  systemFontFamily: string;
  defaultFontFamily: string;
  selfBold: boolean;
  selfItalic: boolean;
  otherBold: boolean;
  otherItalic: boolean;
  systemBold: boolean;
  systemItalic: boolean;
  defaultBold: boolean;
  defaultItalic: boolean;
};

type ChatRole = 'self' | 'other' | 'system' | 'default';

interface ChatSettingsViewProps {
  embedded?: boolean;
}

const DEFAULT_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const roleConfig: Record<ChatRole, {
  label: string;
  previewLabel: string;
  textKey: keyof ChatStyleDraft;
  bubbleKey: keyof ChatStyleDraft;
  transparentKey: keyof ChatStyleDraft;
  fontKey: keyof ChatStyleDraft;
  boldKey: keyof ChatStyleDraft;
  italicKey: keyof ChatStyleDraft;
  sample: string;
}> = {
  self: {
    label: 'You',
    previewLabel: 'You',
    textKey: 'selfTextColor',
    bubbleKey: 'selfBubbleColor',
    transparentKey: 'selfBubbleTransparent',
    fontKey: 'selfFontFamily',
    boldKey: 'selfBold',
    italicKey: 'selfItalic',
    sample: 'This is how your own message will look.'
  },
  other: {
    label: 'Opponent',
    previewLabel: 'Opponent',
    textKey: 'otherTextColor',
    bubbleKey: 'otherBubbleColor',
    transparentKey: 'otherBubbleTransparent',
    fontKey: 'otherFontFamily',
    boldKey: 'otherBold',
    italicKey: 'otherItalic',
    sample: 'Their replies can have a different style.'
  },
  system: {
    label: 'System',
    previewLabel: 'System',
    textKey: 'systemTextColor',
    bubbleKey: 'systemBubbleColor',
    transparentKey: 'systemBubbleTransparent',
    fontKey: 'systemFontFamily',
    boldKey: 'systemBold',
    italicKey: 'systemItalic',
    sample: 'Check, draw offers, and game notices stay distinct.'
  },
  default: {
    label: 'Default',
    previewLabel: 'Default',
    textKey: 'textColor',
    bubbleKey: 'defaultBubbleColor',
    transparentKey: 'defaultBubbleTransparent',
    fontKey: 'defaultFontFamily',
    boldKey: 'defaultBold',
    italicKey: 'defaultItalic',
    sample: 'Fallback text stays readable when no special role applies.'
  }
};

const getDraftFromSettings = (settings: ReturnType<typeof useSettings>['settings']): ChatStyleDraft => {
  const style = (settings.chatSettings.style ?? {}) as Partial<ChatStyleDraft>;
  const fontFamily = style.fontFamily ?? DEFAULT_FONT;

  return {
    fontFamily,
    fontSize: Number(style.fontSize ?? 14),
    messageSpacing: Number(style.messageSpacing ?? 8),
    transparent: Boolean(style.transparent ?? false),
    textColor: style.textColor ?? '#dbeafe',
    selfTextColor: style.selfTextColor ?? '#7dd3fc',
    otherTextColor: style.otherTextColor ?? '#f8fafc',
    systemTextColor: style.systemTextColor ?? '#fbbf24',
    backgroundColor: style.backgroundColor ?? '#07111f',
    selfBubbleColor: style.selfBubbleColor ?? '#0f2f48',
    otherBubbleColor: style.otherBubbleColor ?? '#172033',
    systemBubbleColor: style.systemBubbleColor ?? '#06223a',
    defaultBubbleColor: style.defaultBubbleColor ?? '#111827',
    selfBubbleTransparent: Boolean(style.selfBubbleTransparent ?? false),
    otherBubbleTransparent: Boolean(style.otherBubbleTransparent ?? false),
    systemBubbleTransparent: Boolean(style.systemBubbleTransparent ?? true),
    defaultBubbleTransparent: Boolean(style.defaultBubbleTransparent ?? true),
    selfFontFamily: style.selfFontFamily ?? fontFamily,
    otherFontFamily: style.otherFontFamily ?? fontFamily,
    systemFontFamily: style.systemFontFamily ?? fontFamily,
    defaultFontFamily: style.defaultFontFamily ?? fontFamily,
    selfBold: Boolean(style.selfBold ?? false),
    selfItalic: Boolean(style.selfItalic ?? false),
    otherBold: Boolean(style.otherBold ?? false),
    otherItalic: Boolean(style.otherItalic ?? false),
    systemBold: Boolean(style.systemBold ?? true),
    systemItalic: Boolean(style.systemItalic ?? false),
    defaultBold: Boolean(style.defaultBold ?? false),
    defaultItalic: Boolean(style.defaultItalic ?? false)
  };
};

const ChatSettingsView: React.FC<ChatSettingsViewProps> = ({ embedded = false }) => {
  const { settings, updateChatSettings } = useSettings();
  const isGlass = settings.uiAppearance.sidebarStyle === 'glass';
  const accent = settings.uiAppearance.accentColor;
  const [draft, setDraft] = useState<ChatStyleDraft>(() => getDraftFromSettings(settings));
  const [draftLineCount, setDraftLineCount] = useState<number>(settings.chatSettings.lineCount);
  const [draftBottomBar, setDraftBottomBar] = useState<boolean>(settings.chatSettings.position === 'bottom');
  const [activeRole, setActiveRole] = useState<ChatRole>('self');

  useEffect(() => {
    setDraft(getDraftFromSettings(settings));
    setDraftLineCount(settings.chatSettings.lineCount);
    setDraftBottomBar(settings.chatSettings.position === 'bottom');
  }, [settings]);

  const fontOptions = useMemo(() => fontFamilyField?.options ?? [
    { label: 'System', value: DEFAULT_FONT },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Courier New', value: "'Courier New', monospace" }
  ], []);

  const updateDraft = <K extends keyof ChatStyleDraft>(key: K, value: ChatStyleDraft[K]) => {
    setDraft(current => ({ ...current, [key]: value }));
  };

  const applyChanges = () => {
    updateChatSettings({
      position: draftBottomBar ? 'bottom' : 'floating',
      lineCount: draftLineCount,
      style: {
        ...settings.chatSettings.style,
        ...draft
      }
    } as any);
  };

  const resetDraft = () => {
    setDraft(getDraftFromSettings(settings));
    setDraftLineCount(settings.chatSettings.lineCount);
    setDraftBottomBar(settings.chatSettings.position === 'bottom');
  };

  const shellStyle: React.CSSProperties = { height: embedded ? 'auto' : '100%', color: isGlass ? '#dbeafe' : '#1f2937' };
  const helpStyle: React.CSSProperties = { fontSize: '0.72rem', color: isGlass ? '#94a3b8' : '#64748b', lineHeight: 1.35 };
  const cardStyle: React.CSSProperties = {
    border: isGlass ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid #d8dee8',
    borderRadius: 16,
    padding: 14,
    background: isGlass ? 'rgba(15, 23, 42, 0.48)' : '#ffffff'
  };
  const inputStyle: React.CSSProperties = {
    borderRadius: 9,
    border: isGlass ? '1px solid rgba(148, 163, 184, 0.28)' : '1px solid #cbd5e1',
    background: isGlass ? 'rgba(2, 6, 23, 0.55)' : '#ffffff',
    color: isGlass ? '#e2e8f0' : '#111827',
    padding: '6px 8px',
    minWidth: 0
  };
  const checkboxLabelStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', fontSize: '0.74rem', fontWeight: 800 };
  const miniToggleStyle: React.CSSProperties = { ...checkboxLabelStyle, border: isGlass ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid #d8dee8', borderRadius: 8, padding: '5px 7px' };

  const roleTextStyle = (role: ChatRole): React.CSSProperties => {
    const config = roleConfig[role];
    return {
      color: draft[config.textKey] as string,
      fontFamily: draft[config.fontKey] as string,
      fontWeight: draft[config.boldKey] ? 800 : 500,
      fontStyle: draft[config.italicKey] ? 'italic' : 'normal'
    };
  };

  const previewMessageStyle = (role: ChatRole): React.CSSProperties => {
    const config = roleConfig[role];
    const bubbleTransparent = draft.transparent || Boolean(draft[config.transparentKey]);

    return {
      marginBottom: draft.messageSpacing,
      padding: bubbleTransparent ? '2px 0' : '8px 10px',
      borderRadius: 12,
      background: bubbleTransparent ? 'transparent' : (draft[config.bubbleKey] as string),
      textShadow: draft.transparent || bubbleTransparent ? '0 1px 5px rgba(0,0,0,0.85)' : undefined,
      ...roleTextStyle(role)
    };
  };

  const previewShellStyle: React.CSSProperties = {
    borderRadius: draft.transparent ? 12 : 18,
    border: draft.transparent ? '1px dashed rgba(148, 163, 184, 0.28)' : (isGlass ? '1px solid rgba(125, 211, 252, 0.24)' : '1px solid #cbd5e1'),
    background: draft.transparent ? 'transparent' : draft.backgroundColor,
    padding: 14,
    fontSize: draft.fontSize,
    boxShadow: draft.transparent ? 'none' : '0 18px 42px rgba(2, 6, 23, 0.22)'
  };

  const roleTabStyle = (role: ChatRole): React.CSSProperties => ({
    border: role === activeRole ? `1px solid ${accent}` : (isGlass ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid #d8dee8'),
    background: role === activeRole ? 'rgba(14, 165, 233, 0.16)' : (isGlass ? 'rgba(2, 6, 23, 0.32)' : '#f8fafc'),
    color: isGlass ? '#e2e8f0' : '#1f2937',
    borderRadius: 10,
    padding: '7px 10px',
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: '0.78rem'
  });

  const compactColorStyle: React.CSSProperties = {
    width: 58,
    height: 30,
    padding: 0,
    borderRadius: 8,
    border: isGlass ? '1px solid rgba(148, 163, 184, 0.32)' : '1px solid #cbd5e1',
    background: 'transparent',
    flex: '0 0 auto'
  };

  const renderActiveRoleEditor = () => {
    const role = activeRole;
    const config = roleConfig[role];
    const previewStyle = previewMessageStyle(role);

    return (
      <div
        style={{
          display: 'grid',
          gap: 12,
          padding: '12px',
          borderRadius: 14,
          border: isGlass ? '1px solid rgba(148, 163, 184, 0.16)' : '1px solid #e2e8f0',
          background: isGlass ? 'rgba(2, 6, 23, 0.22)' : '#f8fafc',
          minWidth: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <strong style={{ fontSize: '0.95rem' }}>{config.label}</strong>
          <label style={{ ...miniToggleStyle, padding: '5px 8px' }} title="Show or hide this role's message bubble">
            <input
              type="checkbox"
              checked={!Boolean(draft[config.transparentKey])}
              onChange={event => updateDraft(config.transparentKey, (!event.target.checked) as never)}
            />
            Bubble
          </label>
        </div>

        <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
          <div style={{ display: 'grid', gap: 5, minWidth: 0 }}>
            <span style={{ ...helpStyle, fontWeight: 800 }}>Text</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <input
                type="color"
                value={draft[config.textKey] as string}
                onChange={event => updateDraft(config.textKey, event.target.value as never)}
                style={compactColorStyle}
                title={`${config.label} text color`}
              />
              <label style={miniToggleStyle} title="Bold">
                <input
                  type="checkbox"
                  checked={Boolean(draft[config.boldKey])}
                  onChange={event => updateDraft(config.boldKey, event.target.checked as never)}
                />
                B
              </label>
              <label style={miniToggleStyle} title="Italic">
                <input
                  type="checkbox"
                  checked={Boolean(draft[config.italicKey])}
                  onChange={event => updateDraft(config.italicKey, event.target.checked as never)}
                />
                I
              </label>
            </div>
          </div>

          <label style={{ display: 'grid', gap: 5, minWidth: 0 }}>
            <span style={{ ...helpStyle, fontWeight: 800 }}>Font style</span>
            <select
              value={draft[config.fontKey] as string}
              onChange={event => updateDraft(config.fontKey, event.target.value as never)}
              style={{ ...inputStyle, width: '100%', maxWidth: 240 }}
              title="Font"
            >
              {fontOptions.map(option => <option key={String(option.value)} value={String(option.value)}>{option.label}</option>)}
            </select>
          </label>

          <label style={{ display: 'grid', gap: 5, minWidth: 0 }}>
            <span style={{ ...helpStyle, fontWeight: 800 }}>Bubble color</span>
            <input
              type="color"
              value={draft[config.bubbleKey] as string}
              onChange={event => updateDraft(config.bubbleKey, event.target.value as never)}
              style={compactColorStyle}
              title={`${config.label} bubble color`}
            />
          </label>
        </div>

        <div style={{ ...previewStyle, marginBottom: 0, overflowWrap: 'anywhere' }}>
          <strong>{config.previewLabel}:</strong> {config.sample}
        </div>
      </div>
    );
  };

  return (
    <div className={embedded ? 'chat-settings-view cu-view-shell' : 'view-container chat-settings-view cu-view-shell'} style={shellStyle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <section style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start', marginBottom: 10 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Live chat preview</h3>
              <p style={{ ...helpStyle, margin: '4px 0 0' }}>Preview the actual display while editing the compact controls below.</p>
            </div>
            <label style={{ ...checkboxLabelStyle, border: isGlass ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid #d8dee8', borderRadius: 999, padding: '7px 10px' }}>
              <input type="checkbox" checked={draft.transparent} onChange={event => updateDraft('transparent', event.target.checked)} />
              Transparent panel
            </label>
          </div>
          <div style={previewShellStyle}>
            {(['self', 'other', 'system', 'default'] as ChatRole[]).map(role => {
              const config = roleConfig[role];
              return (
                <div key={role} style={previewMessageStyle(role)}>
                  <strong>{config.previewLabel}:</strong> {config.sample}
                </div>
              );
            })}
          </div>
        </section>

        <section style={cardStyle}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.98rem' }}>Message styles</h3>
                <p style={{ ...helpStyle, margin: '3px 0 0' }}>Choose one role, then edit only that role so docked windows stay narrow.</p>
              </div>
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ ...helpStyle, fontWeight: 800 }}>Panel background</span>
                <input
                  type="color"
                  value={draft.backgroundColor}
                  onChange={event => updateDraft('backgroundColor', event.target.value)}
                  style={compactColorStyle}
                  title="Chat panel background"
                />
              </label>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['self', 'other', 'system', 'default'] as ChatRole[]).map(role => (
                <button key={role} type="button" onClick={() => setActiveRole(role)} style={roleTabStyle(role)}>
                  {roleConfig[role].label}
                </button>
              ))}
            </div>

            {renderActiveRoleEditor()}
          </div>
        </section>

        <section style={cardStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, alignItems: 'center' }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <strong>{fontSizeField?.label ?? 'Font size'} ({draft.fontSize}px)</strong>
              <input type="range" min={10} max={24} step={1} value={draft.fontSize} onChange={event => updateDraft('fontSize', Number(event.target.value))} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <strong>{messageSpacingField?.label ?? 'Message spacing'} ({draft.messageSpacing}px)</strong>
              <input type="range" min={0} max={24} step={1} value={draft.messageSpacing} onChange={event => updateDraft('messageSpacing', Number(event.target.value))} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <strong>{lineCountField?.label ?? 'Visible lines'} ({draftLineCount})</strong>
              <input type="range" min={1} max={10} step={1} value={draftLineCount} onChange={event => setDraftLineCount(Number(event.target.value))} />
            </label>
            <label style={{ ...checkboxLabelStyle, justifyContent: 'space-between', border: isGlass ? '1px solid rgba(148, 163, 184, 0.16)' : '1px solid #e2e8f0', borderRadius: 12, padding: '10px 12px' }}>
              <span>
                Stick to bottom bar
                <span style={{ ...helpStyle, display: 'block', fontWeight: 400 }}>Off uses the separate floating display layer.</span>
              </span>
              <input type="checkbox" checked={draftBottomBar} onChange={event => setDraftBottomBar(event.target.checked)} />
            </label>
          </div>
        </section>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', position: 'sticky', bottom: 0, padding: '10px 0', background: isGlass ? 'rgba(7, 17, 31, 0.84)' : '#fff' }}>
          <button type="button" onClick={resetDraft} style={{ border: isGlass ? '1px solid rgba(148, 163, 184, 0.28)' : '1px solid #cbd5e1', background: isGlass ? 'rgba(15, 23, 42, 0.72)' : '#ffffff', color: isGlass ? '#dbeafe' : '#334155', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontWeight: 700 }}>
            Reset
          </button>
          <button type="button" onClick={applyChanges} style={{ border: `1px solid ${accent}`, background: accent, color: '#ffffff', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontWeight: 800 }}>
            Apply chat options
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatSettingsView;
