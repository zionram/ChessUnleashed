import React from 'react';
import AppearanceView from '../views/AppearanceView';
import ImportExportView from '../views/ImportExportView';
import LetsPlaySetupView from '../views/LetsPlaySetupView';
import SettingsPanelShellView from '../views/SettingsPanelShellView';
import AIPackageBuilderView from '../views/AIPackageBuilderView';
import ActiveTemplateAuditView from '../views/ActiveTemplateAuditView';

import {
  Gamepad2, Palette, Puzzle, Grid3x3, Route, Layers, Volume2, Sliders, Package, Settings, MessageCircle, Wand2, Sparkles, FileText, Globe, Terminal
} from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  type?: 'action' | 'overlay' | 'toggle' | 'submenu';
  children?: MenuItem[];
  actionId?: string;
  overlayTitle?: string;
  component?: React.ComponentType<any>;
  icon?: React.ReactNode;
}

export const MENU_SCHEMA: MenuItem[] = [
  {
    id: 'lets-play',
    label: "Let's Play!",
    icon: React.createElement(Gamepad2, { size: 18 }),
    type: 'overlay',
    overlayTitle: "Let's Play!",
    component: LetsPlaySetupView
  },
  {
    id: 'appearance',
    label: 'Environment',
    icon: React.createElement(Palette, { size: 18 }),
    type: 'submenu',
    children: [
      {
        id: 'environment-look',
        label: 'Look',
        icon: React.createElement(Palette, { size: 16 }),
        type: 'submenu',
        children: [
          { id: 'app-pieces', label: 'Pieces', icon: React.createElement(Puzzle, { size: 16 }), type: 'action', actionId: 'toggle-piece-editor' },
          {
            id: 'environment-board',
            label: 'Board',
            icon: React.createElement(Grid3x3, { size: 16 }),
            type: 'submenu',
            children: [
              { id: 'app-squares', label: 'Squares', icon: React.createElement(Grid3x3, { size: 16 }), type: 'action', actionId: 'toggle-squares' },
              { id: 'app-paths', label: 'Paths', icon: React.createElement(Route, { size: 16 }), type: 'action', actionId: 'toggle-paths' },
              { id: 'app-layers', label: 'Layers', icon: React.createElement(Layers, { size: 16 }), type: 'action', actionId: 'toggle-layers' },
          {
            id: 'edit-appearance',
            label: 'Themes',
            icon: React.createElement(Settings, { size: 16 }),
            type: 'overlay',
            overlayTitle: 'Themes',
            component: AppearanceView
          }
            ]
          },
          { id: 'app-background', label: 'Background', icon: React.createElement(Palette, { size: 16 }), type: 'action', actionId: 'toggle-background' },
          { id: 'app-animation', label: 'Animation', icon: React.createElement(Wand2, { size: 16 }), type: 'action', actionId: 'toggle-animation-settings' },
          { id: 'app-platform-ui', label: 'Platform UI', icon: React.createElement(Palette, { size: 16 }), type: 'action', actionId: 'toggle-platform-appearance' }
        ]
      },
      {
        id: 'environment-sound',
        label: 'Sound',
        icon: React.createElement(Volume2, { size: 16 }),
        type: 'submenu',
        children: [
          { id: 'app-volume', label: 'Audio Settings', icon: React.createElement(Volume2, { size: 16 }), type: 'action', actionId: 'toggle-audio' }
        ]
      },
      {
        id: 'environment-load-set',
        label: 'Packages',
        icon: React.createElement(Package, { size: 16 }),
        type: 'overlay',
        overlayTitle: 'Package Manager',
        component: ImportExportView
      }
    ]
  },
  {
    id: 'tools',
    label: 'Tools',
    icon: React.createElement(MessageCircle, { size: 18 }),
    type: 'submenu',
    children: [
      {
        id: 'tools-chat',
        label: 'Chat',
        icon: React.createElement(MessageCircle, { size: 16 }),
        type: 'toggle',
        actionId: 'toggle-chat'
      },
      {
        id: 'tools-bots',
        label: 'Bots',
        icon: React.createElement(Settings, { size: 16 }),
        type: 'toggle',
        actionId: 'toggle-bots'
      },
      {
        id: 'tools-import-export',
        label: 'Package Manager',
        icon: React.createElement(Package, { size: 16 }),
        type: 'overlay',
        overlayTitle: 'Package Manager',
        component: ImportExportView
      },
      {
        id: 'tools-rule-builder',
        label: 'Rule Builder',
        icon: React.createElement(Settings, { size: 16 }),
        type: 'toggle',
        actionId: 'toggle-rule-builder'
      },
      { id: 'toggle-history', label: 'History', type: 'toggle', actionId: 'toggle-history' },
      { id: 'toggle-stats', label: 'Stats', type: 'toggle', actionId: 'toggle-stats' },
      { id: 'toggle-analysis', label: 'Analysis', type: 'toggle', actionId: 'toggle-analysis' },
      { id: 'toggle-wheels', label: 'Move Assist', type: 'toggle', actionId: 'toggle-wheels' },
      {
        id: 'fics-online',
        label: 'FICS Online',
        icon: React.createElement(Globe, { size: 16 }),
        type: 'action',
        actionId: 'toggle-fics-online'
      }
    ]
  },
  {
    id: 'advanced',
    label: 'Advanced',
    icon: React.createElement(Package, { size: 18 }),
    type: 'submenu',
    children: [
      {
        id: 'advanced-gaming',
        label: 'Gaming',
        icon: React.createElement(Gamepad2, { size: 16 }),
        type: 'submenu',
        children: [
          { id: 'advanced-sound-editor', label: 'Sound Editor', icon: React.createElement(Sliders, { size: 16 }), type: 'action', actionId: 'toggle-sound-editor' },
          { id: 'toggle-event-builder', label: 'Event Builder', type: 'toggle', actionId: 'toggle-event-builder' },
          { id: 'toggle-animation-builder', label: 'Animation Builder', icon: React.createElement(Wand2, { size: 16 }), type: 'toggle', actionId: 'toggle-animation-builder' },
          { id: 'toggle-event-log', label: 'Event Log', type: 'toggle', actionId: 'toggle-event-log' },
          {
            id: 'fics-console',
            label: 'FICS Console',
            icon: React.createElement(Terminal, { size: 16 }),
            type: 'toggle',
            actionId: 'toggle-fics-console'
          },
          {
            id: 'advanced-ai-package-builder',
            label: 'AI Package Builder',
            icon: React.createElement(Sparkles, { size: 16 }),
            type: 'overlay',
            overlayTitle: 'AI Package Builder',
            component: AIPackageBuilderView
          }
        ]
      },
      {
        id: 'advanced-system',
        label: 'System',
        icon: React.createElement(Package, { size: 16 }),
        type: 'submenu',
        children: [
          { id: 'toggle-troubleshooter', label: 'Troubleshooter', type: 'toggle', actionId: 'toggle-troubleshooter' },
          { id: 'toggle-about-support', label: 'About / Support', type: 'toggle', actionId: 'toggle-about-support' },
          {
            id: 'advanced-template-audit',
            label: 'Active Template Audit',
            icon: React.createElement(FileText, { size: 16 }),
            type: 'overlay',
            overlayTitle: 'Active Template Audit',
            component: ActiveTemplateAuditView
          },
          {
            id: 'advanced-validation',
            label: 'Validation',
            icon: React.createElement(Settings, { size: 16 }),
            type: 'overlay',
            overlayTitle: 'Validation',
            component: SettingsPanelShellView
          },
          {
            id: 'settings-shell',
            label: 'Settings Builder',
            icon: React.createElement(Settings, { size: 16 }),
            type: 'overlay',
            overlayTitle: 'Settings',
            component: SettingsPanelShellView
          },
          { id: 'reset-system', label: 'Reset System', type: 'action', actionId: 'reset-system' }
        ]
      }
    ]
  }
];
