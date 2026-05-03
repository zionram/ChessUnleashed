import type { UIAppearanceSettings } from '../context/SettingsContext';

export interface UIAppearancePreset {
  id: string;
  label: string;
  uiAppearance: Partial<UIAppearanceSettings>;
}

export const UI_APPEARANCE_PRESETS: UIAppearancePreset[] = [
  {
    id: 'default',
    label: 'Default',
    uiAppearance: {
      accentColor: '#4f46e5',
      density: 'comfortable',
      baseFontSize: 14,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      sidebarStyle: 'flat',
      panelOpacity: 100,
      panelBackdropBlur: 0,
      overlayBackdropOpacity: 20,
      overlayContentBlur: 10,
      buttonStyle: 'rounded',
      panelBackgroundColor: '#ffffff',
      appBackgroundColor: '#f5f5f5',
      toolbarBackgroundColor: '#2c3e50',
      showTipsBoard: true,
      tipsRotationSeconds: 12
    }
  },
  {
    id: 'obsidian-workshop',
    label: 'Obsidian Workshop',
    uiAppearance: {
      accentColor: '#38bdf8',
      density: 'compact',
      baseFontSize: 13,
      sidebarStyle: 'glass',
      panelOpacity: 85,
      panelBackdropBlur: 12,
      overlayBackdropOpacity: 60,
      overlayContentBlur: 18,
      buttonStyle: 'square',
      panelBackgroundColor: '#0d1117',
      appBackgroundColor: '#060b14',
      toolbarBackgroundColor: '#0d1117',
      welcomePanelColor: '#0d1117'
    }
  }
];
