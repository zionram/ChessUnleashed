export type SettingsCategory = 'chat' | 'timer' | 'ui' | 'pieces';

export type SettingsFieldType = 'select' | 'range';

export interface SettingsOption {
  label: string;
  value: string;
}

export interface SettingsFieldConfig {
  id: string;
  label: string;
  type: SettingsFieldType;
  category: SettingsCategory;
  settingsPath: string;
  defaultValue: string | number;
  options?: SettingsOption[];
  min?: number;
  max?: number;
  step?: number;
  validators?: string[];
}

const settingsFields: SettingsFieldConfig[] = [];

export const registerSettingsField = (field: SettingsFieldConfig) => {
  if (settingsFields.find(existing => existing.id === field.id)) return;
  settingsFields.push(field);
};

export const getRegisteredSettingsFields = () => [...settingsFields];

export const getRegisteredSettingsField = (id: string) =>
  settingsFields.find(field => field.id === id);

registerSettingsField({
  id: 'chat.position',
  label: 'Position',
  type: 'select',
  category: 'chat',
  settingsPath: 'chatSettings.position',
  defaultValue: 'right',
  options: [
    { label: 'Right Panel', value: 'right' },
    { label: 'Bottom Bar', value: 'bottom' },
    { label: 'Floating', value: 'floating' }
  ]
});

registerSettingsField({
  id: 'chat.lineCount',
  label: 'Line Count',
  type: 'range',
  category: 'chat',
  settingsPath: 'chatSettings.lineCount',
  defaultValue: 3,
  min: 1,
  max: 10,
  step: 1
});

registerSettingsField({
  id: 'chat.fontFamily',
  label: 'Font',
  type: 'select',
  category: 'chat',
  settingsPath: 'chatSettings.style.fontFamily',
  defaultValue: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  options: [
    { label: 'System', value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Courier New', value: "'Courier New', monospace" }
  ]
});

registerSettingsField({
  id: 'chat.fontSize',
  label: 'Font Size',
  type: 'range',
  category: 'chat',
  settingsPath: 'chatSettings.style.fontSize',
  defaultValue: 13,
  min: 10,
  max: 20,
  step: 1
});

registerSettingsField({
  id: 'chat.messageSpacing',
  label: 'Message Spacing',
  type: 'range',
  category: 'chat',
  settingsPath: 'chatSettings.style.messageSpacing',
  defaultValue: 8,
  min: 2,
  max: 16,
  step: 1
});

registerSettingsField({
  id: 'timer.placement',
  label: 'Timer Placement',
  type: 'select',
  category: 'timer',
  settingsPath: 'timeControl.placement',
  defaultValue: 'right',
  validators: ['timer.draggablePlacement'],
  options: [
    { label: 'Top', value: 'top' },
    { label: 'Left', value: 'left' },
    { label: 'Right', value: 'right' },
    { label: 'Right Panel', value: 'right-panel' }
  ]
});

registerSettingsField({
  id: 'timer.behavior',
  label: 'Timer Movement',
  type: 'select',
  category: 'timer',
  settingsPath: 'timeControl.behavior',
  defaultValue: 'static',
  validators: ['timer.draggablePlacement'],
  options: [
    { label: 'Static', value: 'static' },
    { label: 'Draggable', value: 'draggable' }
  ]
});

registerSettingsField({
  id: 'ui.fontFamily',
  label: 'App Font',
  type: 'select',
  category: 'ui',
  settingsPath: 'uiAppearance.fontFamily',
  defaultValue: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  options: [
    { label: 'System', value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Courier New', value: "'Courier New', monospace" }
  ]
});

registerSettingsField({
  id: 'ui.baseFontSize',
  label: 'Base Font Size',
  type: 'range',
  category: 'ui',
  settingsPath: 'uiAppearance.baseFontSize',
  defaultValue: 14,
  min: 12,
  max: 20,
  step: 1
});

registerSettingsField({
  id: 'ui.accentColor',
  label: 'Accent Color',
  type: 'select',
  category: 'ui',
  settingsPath: 'uiAppearance.accentColor',
  defaultValue: '#4f46e5',
  options: [
    { label: 'Indigo', value: '#4f46e5' },
    { label: 'Blue', value: '#2563eb' },
    { label: 'Green', value: '#16a34a' },
    { label: 'Red', value: '#dc2626' }
  ]
});

registerSettingsField({
  id: 'ui.density',
  label: 'Density',
  type: 'select',
  category: 'ui',
  settingsPath: 'uiAppearance.density',
  defaultValue: 'comfortable',
  options: [
    { label: 'Compact', value: 'compact' },
    { label: 'Comfortable', value: 'comfortable' },
    { label: 'Spacious', value: 'spacious' }
  ]
});

registerSettingsField({
  id: 'ui.showTipsBoard',
  label: 'Show Tips Board',
  type: 'select',
  category: 'ui',
  settingsPath: 'uiAppearance.showTipsBoard',
  defaultValue: 'true',
  options: [
    { label: 'Show', value: 'true' },
    { label: 'Hide', value: 'false' }
  ]
});

registerSettingsField({
  id: 'ui.tipsRotationSeconds',
  label: 'Tip Rotation',
  type: 'range',
  category: 'ui',
  settingsPath: 'uiAppearance.tipsRotationSeconds',
  defaultValue: 12,
  min: 3,
  max: 60,
  step: 1
});

registerSettingsField({
  id: 'pieces.configurationMode',
  label: 'Configuration Mode',
  type: 'select',
  category: 'pieces',
  settingsPath: 'themeDraft.pieceThemeMode',
  defaultValue: 'unified',
  options: [
    { label: 'Unified Pieces', value: 'unified' },
    { label: 'Team Pieces', value: 'team' }
  ]
});

registerSettingsField({
  id: 'pieces.method',
  label: 'Method',
  type: 'select',
  category: 'pieces',
  settingsPath: 'themeDraft.activePieceTheme.type',
  defaultValue: 'builtin',
  options: [
    { label: 'Built-in Set', value: 'builtin' },
    { label: 'Custom Images', value: 'custom' }
  ]
});

registerSettingsField({
  id: 'pieces.builtinSet',
  label: 'Built-in Set',
  type: 'select',
  category: 'pieces',
  settingsPath: 'themeDraft.activePieceTheme.builtinSet',
  defaultValue: 'cburnett',
  options: [
    { label: 'CBURNETT', value: 'cburnett' },
    { label: 'ALPHA', value: 'alpha' },
    { label: 'MERIDA', value: 'merida' },
    { label: 'FRESCA', value: 'fresca' },
    { label: 'CALIENTE', value: 'caliente' }
  ]
});
