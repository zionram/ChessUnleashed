export interface SettingsControlRef {
  id: string;
  settingId?: string;
  settingsPath?: string;
  childTemplateId?: string;
}

export interface SettingsSection {
  id: string;
  label: string;
  controls: SettingsControlRef[];
}

export interface SettingsTemplate {
  id: string;
  label: string;
  sections: SettingsSection[];
  customPanelId?: string;
}

const templates: SettingsTemplate[] = [];

export const registerSettingsTemplate = (template: SettingsTemplate) => {
  if (templates.find(existing => existing.id === template.id)) return;
  templates.push(template);
};

export const getRegisteredSettingsTemplates = () => [...templates];

export const getRegisteredSettingsTemplate = (id: string) =>
  templates.find(template => template.id === id);

registerSettingsTemplate({
  id: 'settings-lets-play',
  label: "Let's Play!",
  sections: [
    {
      id: 'play-setup',
      label: 'Match Setup',
      controls: [
        { id: 'play-game-mode-link', childTemplateId: 'play-game-mode' },
        { id: 'play-opponent-link', childTemplateId: 'play-opponent' },
        { id: 'play-timer-link', childTemplateId: 'timer-settings' }
      ]
    }
  ]
});

registerSettingsTemplate({
  id: 'settings-environment',
  label: 'Environment',
  sections: [
    {
      id: 'environment-setup',
      label: 'Look & Feel',
      controls: [
        { id: 'environment-look-link', childTemplateId: 'environment-look' },
        { id: 'environment-sound-link', childTemplateId: 'environment-sound' }
      ]
    }
  ]
});

registerSettingsTemplate({
  id: 'settings-tools',
  label: 'Tools',
  sections: [
    {
      id: 'tools-setup',
      label: 'Utility Systems',
      controls: [
        { id: 'tools-chat-link', childTemplateId: 'tools-chat-behavior' },
        { id: 'tools-analysis-link', childTemplateId: 'tools-analysis' },
        { id: 'tools-history-link', childTemplateId: 'tools-history' },
        { id: 'tools-stats-link', childTemplateId: 'tools-stats' }
      ]
    }
  ]
});

registerSettingsTemplate({
  id: 'settings-advanced',
  label: 'Advanced',
  sections: [
    {
      id: 'advanced-setup',
      label: 'Power Tools',
      controls: [
        { id: 'advanced-system-link', childTemplateId: 'advanced-event-system' }
      ]
    }
  ]
});

registerSettingsTemplate({
  id: 'timer-settings',
  label: 'Timer',
  sections: [
    {
      id: 'timer-basic',
      label: 'Game Clock',
      controls: [
        { id: 'timer-initial-time', settingsPath: 'timeControl.initialTimeSeconds' }
      ]
    },
    {
      id: 'timer-movement',
      label: 'Movement & Placement',
      controls: [
        { id: 'timer-placement', settingId: 'timer.placement' },
        { id: 'timer-behavior', settingId: 'timer.behavior' },
        // Placeholder for future nested template support.
        { id: 'timer-advanced-link', childTemplateId: 'timer-settings-advanced' }
      ]
    },
    {
      id: 'timer-advanced',
      label: 'Advanced',
      controls: [
        { id: 'timer-manual-clock-press', settingsPath: 'timeControl.manualClockPress' },
        { id: 'timer-clock-behavior-link', childTemplateId: 'timer-clock-behavior' }
      ]
    }
  ]
});

registerSettingsTemplate({
  id: 'timer-clock-behavior',
  label: 'Clock Behavior',
  sections: [
    {
      id: 'timer-clock-behavior-placeholder',
      label: 'Clock Behavior Settings',
      controls: [
        { id: 'timer-enabled', settingsPath: 'timeControl.enabled' },
        { id: 'timer-increment', settingsPath: 'timeControl.incrementSeconds' }
      ]
    }
  ]
});

registerSettingsTemplate({
  id: 'environment-look',
  label: 'Look',
  sections: [
    {
      id: 'environment-look-setup',
      label: 'Visual Settings',
      controls: [
        { id: 'environment-platform-ui-link', childTemplateId: 'platform-ui-appearance' },
        { id: 'environment-pieces-link', childTemplateId: 'environment-pieces' }
      ]
    }
  ]
});

registerSettingsTemplate({
  id: 'platform-ui-appearance',
  label: 'Platform UI',
  sections: [
    {
      id: 'ui-typography',
      label: 'Typography',
      controls: [
        { id: 'ui-font-family', settingId: 'ui.fontFamily' },
        { id: 'ui-base-font-size', settingId: 'ui.baseFontSize' }
      ]
    },
    {
      id: 'ui-color',
      label: 'Color',
      controls: [
        { id: 'ui-accent-color', settingId: 'ui.accentColor' }
      ]
    },
    {
      id: 'ui-density',
      label: 'Layout Density',
      controls: [
        { id: 'ui-density-setting', settingId: 'ui.density' }
      ]
    },
    {
      id: 'ui-tips-board',
      label: 'Tips Board',
      controls: [
        { id: 'ui-show-tips-board', settingId: 'ui.showTipsBoard' },
        { id: 'ui-tips-rotation', settingId: 'ui.tipsRotationSeconds' }
      ]
    }
  ]
});

registerSettingsTemplate({
  id: 'environment-pieces',
  label: 'Pieces',
  customPanelId: 'piece-editor',
  sections: [
    {
      id: 'environment-pieces-editor',
      label: 'Piece Editor',
      controls: []
    }
  ]
});

registerSettingsTemplate({
  id: 'play-game-mode',
  label: 'Game Mode',
  sections: [
    {
      id: 'play-game-mode-placeholder',
      label: 'Game Mode',
      controls: []
    }
  ]
});

registerSettingsTemplate({
  id: 'play-opponent',
  label: 'Opponent',
  sections: [
    {
      id: 'play-opponent-placeholder',
      label: 'Opponent',
      controls: []
    }
  ]
});

registerSettingsTemplate({
  id: 'environment-sound',
  label: 'Sound',
  sections: [
    {
      id: 'environment-sound-placeholder',
      label: 'Sound',
      controls: []
    }
  ]
});

registerSettingsTemplate({
  id: 'tools-chat-behavior',
  label: 'Chat Behavior',
  sections: [
    {
      id: 'tools-chat-placeholder',
      label: 'Chat Behavior',
      controls: []
    }
  ]
});

registerSettingsTemplate({
  id: 'tools-analysis',
  label: 'Analysis',
  sections: [
    {
      id: 'tools-analysis-placeholder',
      label: 'Analysis',
      controls: []
    }
  ]
});

registerSettingsTemplate({
  id: 'tools-history',
  label: 'History',
  sections: [
    {
      id: 'tools-history-placeholder',
      label: 'History',
      controls: []
    }
  ]
});

registerSettingsTemplate({
  id: 'tools-stats',
  label: 'Stats',
  sections: [
    {
      id: 'tools-stats-placeholder',
      label: 'Stats',
      controls: []
    }
  ]
});

registerSettingsTemplate({
  id: 'advanced-event-system',
  label: 'System',
  sections: [
    {
      id: 'advanced-event-placeholder',
      label: 'System Tools',
      controls: [
        { id: 'advanced-import-export-link', childTemplateId: 'advanced-import-export' },
        { id: 'advanced-validation-link', childTemplateId: 'advanced-validation' },
        { id: 'advanced-settings-builder-link', childTemplateId: 'advanced-settings-builder' }
      ]
    }
  ]
});

registerSettingsTemplate({
  id: 'advanced-validation',
  label: 'Validation',
  sections: [
    {
      id: 'advanced-validation-placeholder',
      label: 'Validation',
      controls: []
    }
  ]
});

registerSettingsTemplate({
  id: 'advanced-import-export',
  label: 'Import / Export',
  sections: [
    {
      id: 'advanced-import-export-placeholder',
      label: 'Import / Export',
      controls: []
    }
  ]
});

registerSettingsTemplate({
  id: 'advanced-settings-builder',
  label: 'Settings Builder',
  sections: [
    {
      id: 'advanced-settings-builder-placeholder',
      label: 'Settings Builder',
      controls: []
    }
  ]
});
