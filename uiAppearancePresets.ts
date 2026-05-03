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
      panelOpacity: 76,
      panelBackdropBlur: 14,
      overlayBackdropOpacity: 64,
      overlayContentBlur: 18,
      buttonStyle: 'square',
      panelBackgroundColor: '#07111f',
      appBackgroundColor: '#020617',
      toolbarBackgroundColor: '#050a12',
      welcomePanelColor: '#07111f',
      welcomePanelFrameColor: '#38bdf8',
      welcomePanelFrameMode: 'accent',
      welcomeSidebarContainerColor: '#07111f',
      welcomeSidebarContainerFrameColor: '#38bdf8',
      welcomeSidebarContainerFrameMode: 'accent'
    }
  }
];
