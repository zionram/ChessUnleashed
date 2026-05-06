import React, { useState } from 'react';
import { useAudio } from '../context/AudioContext';
import { useSettings } from '../context/SettingsContext';
import { getRegisteredSettingsTemplate } from '../registry/SettingsTemplateRegistry';
import { SettingsFieldRenderer, SettingsFieldShell, type SupportedSettingsFieldType } from '../components/settings/SettingsFieldRenderer';
import { buildExperiencePackage, createExperiencePackageZip, readExperiencePackageZip, validateExperiencePackage, type ExperiencePackage } from '../packages/ExperiencePackage';
import type { ImportedAssetRegistryEntry } from '../electron-assets';
import ThemeEditorView from './ThemeEditorView';

type SettingsRendererField = {
  key: string;
  type: SupportedSettingsFieldType;
  label: string;
  description?: string;
  value: string | number | boolean;
  onChange: (value: string | number | boolean) => void;
  options?: Array<{ label: string; value: string }>;
  min?: number;
  max?: number;
  step?: number;
  width?: string;
};

type SettingsBuilderSection = {
  id: string;
  wrapperStyle?: React.CSSProperties;
  title: string;
  description?: string;
  fields?: SettingsRendererField[];
  marginBottom?: string;
  manualContent?: React.ReactNode;
  customPanel?: React.ReactNode;
  childLinks?: Array<{
    id: string;
    label: string;
  }>;
};

const SectionHeader: React.FC<{ title: string; description?: string; marginBottom?: string }> = ({
  title,
  description,
  marginBottom = '12px'
}) => (
  <div style={{ marginBottom }}>
    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#2c3e50', marginBottom: '4px' }}>
      {title}
    </div>
    {description && (
      <div style={{ fontSize: '0.8rem', color: '#5d6d7e' }}>
        {description}
      </div>
    )}
  </div>
);

const SettingsSectionRenderer: React.FC<{
  title: string;
  description?: string;
  fields?: SettingsRendererField[];
  marginBottom?: string;
  children?: React.ReactNode;
}> = ({
  title,
  description,
  fields = [],
  marginBottom,
  children
}) => (
  <>
    <SectionHeader title={title} description={description} marginBottom={marginBottom} />
    {fields.map(field => (
      <SettingsFieldRenderer
        key={field.key}
        fieldKey={field.key}
        type={field.type}
        label={field.label}
        description={field.description}
        value={field.value}
        onChange={field.onChange}
        options={field.options}
        min={field.min}
        max={field.max}
        step={field.step}
        width={field.width}
      />
    ))}
    {children}
  </>
);

const SUPPORTED_FIELD_TYPES = ['select', 'color', 'checkbox', 'number', 'range'] as const;

const isSupportedFieldType = (type: string): type is typeof SUPPORTED_FIELD_TYPES[number] =>
  SUPPORTED_FIELD_TYPES.includes(type as typeof SUPPORTED_FIELD_TYPES[number]);

const getTemplateChildLinks = (templateId: string) => {
  const template = getRegisteredSettingsTemplate(templateId);
  if (!template) return [];

  return template.sections.flatMap(section =>
    section.controls.flatMap(control => {
      if (!control.childTemplateId) return [];
      const childTemplate = getRegisteredSettingsTemplate(control.childTemplateId);
      if (!childTemplate) return [];
      return [{ id: childTemplate.id, label: childTemplate.label }];
    })
  );
};

const getCustomPanelContent = (templateId: string) => {
  const template = getRegisteredSettingsTemplate(templateId);
  if (!template?.customPanelId) return null;

  if (template.customPanelId === 'piece-editor') {
    return <ThemeEditorView />;
  }

  return null;
};

const SettingsBuilder: React.FC<{
  activeSection: string;
  sections: SettingsBuilderSection[];
}> = ({ activeSection, sections }) => {
  const [navigationStack, setNavigationStack] = useState<string[]>([activeSection]);

  React.useEffect(() => {
    setNavigationStack([activeSection]);
  }, [activeSection]);

  const currentSectionId = navigationStack[navigationStack.length - 1] ?? activeSection;
  const section = sections.find(entry => entry.id === currentSectionId);
  if (!section) return null;

  const content = (
    <>
      {navigationStack.length > 1 && (
        <div style={{ marginBottom: '10px' }}>
          <button
            onClick={() => setNavigationStack(stack => stack.slice(0, -1))}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #d0d7de',
              background: '#fff',
              color: '#2c3e50',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            Back
          </button>
        </div>
      )}
      {!!section.childLinks?.length && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
          {section.childLinks.map(link => (
            <button
              key={link.id}
              onClick={() => setNavigationStack(stack => [...stack, link.id])}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #d0d7de',
                background: '#fff',
                color: '#2c3e50',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              {link.label}
            </button>
          ))}
        </div>
      )}
      {section.customPanel ? (
        <>
          <SectionHeader
            title={section.title}
            description={section.description}
            marginBottom={section.marginBottom}
          />
          {section.customPanel}
        </>
      ) : (
        <SettingsSectionRenderer
          title={section.title}
          description={section.description}
          fields={section.fields}
          marginBottom={section.marginBottom}
        >
          {section.manualContent}
        </SettingsSectionRenderer>
      )}
    </>
  );

  if (!section.wrapperStyle) return content;

  return <div style={section.wrapperStyle}>{content}</div>;
};

const SettingsPanelShellView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'settings-lets-play' | 'settings-environment' | 'settings-tools' | 'settings-advanced'>('settings-lets-play');
  const [importValidationMessage, setImportValidationMessage] = useState<string | null>(null);
  const [validatedImportPackage, setValidatedImportPackage] = useState<ExperiencePackage | null>(null);
  const [validatedImportAssets, setValidatedImportAssets] = useState<ImportedAssetRegistryEntry[]>([]);
  const [packagePrepareStatus, setPackagePrepareStatus] = useState<string | null>(null);
  const [preparedPackageBlob, setPreparedPackageBlob] = useState<Blob | null>(null);
  const [isPreparingPackage, setIsPreparingPackage] = useState(false);
  const { getCurrentProfile, applyProfile } = useAudio();
  const {
    settings,
    updateTemplate,
    updateTimeControl,
    updateUIAppearance,
    updateChatSettings,
    updateBotSettings,
    setGameMode,
    setTrainingWheels,
    setThemeDraft,
    importSettingsCategories
  } = useSettings();
  const letsPlayTemplate = getRegisteredSettingsTemplate('settings-lets-play');
  const environmentTemplate = getRegisteredSettingsTemplate('settings-environment');
  const toolsTemplate = getRegisteredSettingsTemplate('settings-tools');
  const advancedTemplate = getRegisteredSettingsTemplate('settings-advanced');
  const timeTemplate = getRegisteredSettingsTemplate('timer-settings');
  const appearanceTemplate = getRegisteredSettingsTemplate('platform-ui-appearance');
  const timeBasicSection = timeTemplate?.sections.find(section => section.id === 'timer-basic');
  const timeAdvancedSection = timeTemplate?.sections.find(section => section.id === 'timer-advanced');
  const timeChildTemplateId = timeAdvancedSection?.controls.find(control => control.childTemplateId)?.childTemplateId;
  const timeChildTemplate = timeChildTemplateId ? getRegisteredSettingsTemplate(timeChildTemplateId) : undefined;
  const timeChildSection = timeChildTemplate?.sections[0];
  const appearanceTypographySection = appearanceTemplate?.sections.find(section => section.id === 'ui-typography');
  const appearanceColorSection = appearanceTemplate?.sections.find(section => section.id === 'ui-color');
  const appearanceDensitySection = appearanceTemplate?.sections.find(section => section.id === 'ui-density');
  const appearanceTipsSection = appearanceTemplate?.sections.find(section => section.id === 'ui-tips-board');
  const timerInitialTimeControl = timeBasicSection?.controls.find(control => control.settingsPath === 'timeControl.initialTimeSeconds');
  const { enabled, initialTimeSeconds, incrementSeconds } = settings.timeControl;
  const { accentColor, baseFontSize, density, fontFamily, showTipsBoard, tipsRotationSeconds } = settings.uiAppearance;
  const initialMinutes = Math.floor(initialTimeSeconds / 60);
  const initialSeconds = +(initialTimeSeconds - initialMinutes * 60).toFixed(1);
  const fontOptions = [
    { label: 'System', value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Courier New', value: "'Courier New', monospace" }
  ];

  const updateInitialTime = (nextMinutes: number, nextSeconds: number) => {
    const boundedMinutes = Math.max(0, Math.floor(nextMinutes));
    const boundedSeconds = Math.max(0, Math.min(59.9, nextSeconds));
    updateTimeControl({
      initialTimeSeconds: Math.max(3, +(boundedMinutes * 60 + boundedSeconds).toFixed(1))
    });
  };

  const prepareExperiencePackage = async () => {
    setPreparedPackageBlob(null);
    setIsPreparingPackage(true);
    setPackagePrepareStatus('Gathering selected settings');
    const experiencePackage = buildExperiencePackage(settings, {
      audio: getCurrentProfile()
    });
    const validation = validateExperiencePackage(experiencePackage);
    if (!validation.valid) {
      console.warn('ExperiencePackage export blocked:', validation.issues);
      alert(`Experience package export blocked:\n${validation.issues.join('\n')}`);
      setIsPreparingPackage(false);
      return;
    }
    try {
      const blob = await createExperiencePackageZip(experiencePackage, {
        onProgress: progress => setPackagePrepareStatus(progress.message)
      });
      setPreparedPackageBlob(blob);
      setPackagePrepareStatus(`Package ready (${(blob.size / (1024 * 1024)).toFixed(2)} MB).`);
    } catch (error) {
      console.warn('ExperiencePackage asset export blocked:', error);
      setPackagePrepareStatus('Package preparation failed. Try fewer categories or smaller media files.');
      return;
    } finally {
      setIsPreparingPackage(false);
    }
  };

  const savePreparedExperiencePackage = () => {
    if (!preparedPackageBlob) return;
    const url = URL.createObjectURL(preparedPackageBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'chess-unleashed-experience.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const applyExperiencePackage = () => {
    if (!validatedImportPackage) return;

    const { contents } = validatedImportPackage;

    if (contents.template) updateTemplate(contents.template);
    if (contents.uiAppearance) updateUIAppearance(contents.uiAppearance);
    if (contents.timeControl) updateTimeControl(contents.timeControl);
    if (contents.chatSettings) updateChatSettings(contents.chatSettings);
    if (contents.botSettings) updateBotSettings(contents.botSettings);
    if (contents.rules) {
      setGameMode(contents.rules.gameMode);
      setTrainingWheels(contents.rules.trainingWheels);
    }

    let nextAudioProfile = contents.audio ? contents.audio : getCurrentProfile();
    if (contents.audioSettings) nextAudioProfile = { ...nextAudioProfile, ...contents.audioSettings };
    if (contents.soundLibrary) nextAudioProfile = { ...nextAudioProfile, library: contents.soundLibrary };
    if (contents.soundRules) nextAudioProfile = { ...nextAudioProfile, rules: contents.soundRules };
    if (contents.audioPlaylists) nextAudioProfile = { ...nextAudioProfile, ...contents.audioPlaylists };
    if (contents.audio || contents.audioSettings || contents.soundLibrary || contents.soundRules || contents.audioPlaylists) {
      applyProfile(nextAudioProfile);
    }

    importSettingsCategories({
      ...(contents.personalityProfiles ? { personalityProfiles: contents.personalityProfiles } : {}),
      ...(contents.registeredBots ? { registeredBots: contents.registeredBots } : {}),
      ...(contents.localProfile ? { localProfile: contents.localProfile } : {}),
      ...(contents.multiplayerServer ? { multiplayerServer: contents.multiplayerServer } : {}),
      ...(contents.customRulesets ? { customRulesets: contents.customRulesets } : {}),
      ...(contents.customEvents ? { customEvents: contents.customEvents } : {}),
      ...(contents.animationDefinitions ? { animationDefinitions: contents.animationDefinitions } : {}),
      ...(contents.animationRules ? { animationRules: contents.animationRules } : {}),
      ...(validatedImportAssets.length ? { importedAssets: validatedImportAssets } : {})
    });

    setThemeDraft(null);
    setImportValidationMessage('Package applied and saved.');
    setValidatedImportPackage(null);
    setValidatedImportAssets([]);
  };

  const handleExperiencePackageImportSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const zipImport = file.name.toLowerCase().endsWith('.zip')
        ? await readExperiencePackageZip(file, { loadAssets: true })
        : null;
      const parsedPackage = zipImport?.package ?? JSON.parse(await file.text());
      const validation = validateExperiencePackage(parsedPackage);
      if (validation.valid) {
        setValidatedImportPackage(parsedPackage as ExperiencePackage);
        setValidatedImportAssets(zipImport?.importedAssets ?? []);
        setImportValidationMessage(`Valid package: ${parsedPackage.metadata?.name ?? 'Unnamed package'}`);
      } else {
        setValidatedImportPackage(null);
        setValidatedImportAssets([]);
        setImportValidationMessage(`Invalid package: ${validation.issues.join(' ')}`);
      }
    } catch {
      setValidatedImportPackage(null);
      setValidatedImportAssets([]);
      setImportValidationMessage(file.name.toLowerCase().endsWith('.zip') ? 'Invalid package zip.' : 'Invalid JSON file.');
    }
    e.target.value = '';
  };

  const timeRendererFields: SettingsRendererField[] = [];
  (timeBasicSection?.controls ?? []).forEach(control => {
    if (control.settingsPath === 'timeControl.enabled') {
      timeRendererFields.push({
        key: control.id,
        type: 'checkbox' as const,
        label: control.id === 'timer-enabled' ? 'Enable Timer' : 'Enable Timer',
        value: enabled,
        onChange: (value: string | number | boolean) => updateTimeControl({ enabled: Boolean(value) })
      });
      return;
    }

    if (control.settingsPath === 'timeControl.incrementSeconds') {
      timeRendererFields.push({
        key: control.id,
        type: 'number' as const,
        label: (control.id === 'timer-increment' ? 'Increment' : 'Increment') + ` (${incrementSeconds}s)`,
        value: incrementSeconds,
        onChange: (value: string | number | boolean) => updateTimeControl({ incrementSeconds: Number(value) }),
        min: 0,
        max: 60,
        step: 1,
        width: '70px'
      });
    }
  });

  const timeChildRendererFields: SettingsRendererField[] = [];
  (timeChildSection?.controls ?? []).forEach(control => {
    if (control.settingsPath === 'timeControl.enabled') {
      timeChildRendererFields.push({
        key: control.id,
        type: 'checkbox' as const,
        label: control.id === 'timer-enabled' ? 'Enable Timer' : 'Enable Timer',
        value: enabled,
        onChange: (value: string | number | boolean) => updateTimeControl({ enabled: Boolean(value) })
      });
      return;
    }

    if (control.settingsPath === 'timeControl.incrementSeconds') {
      timeChildRendererFields.push({
        key: control.id,
        type: 'number' as const,
        label: (control.id === 'timer-increment' ? 'Increment' : 'Increment') + ` (${incrementSeconds}s)`,
        value: incrementSeconds,
        onChange: (value: string | number | boolean) => updateTimeControl({ incrementSeconds: Number(value) }),
        min: 0,
        max: 60,
        step: 1,
        width: '70px'
      });
    }
  });

  const appearanceRendererFields: SettingsRendererField[] = [];
  (appearanceTemplate?.sections ?? []).forEach(section => {
    section.controls.forEach(control => {
      if (control.settingId === 'ui.accentColor') {
        appearanceRendererFields.push({
          key: control.id,
          type: 'color' as const,
          label: control.id === 'ui-accent-color' ? 'Accent Color' : 'Accent Color',
          value: accentColor,
          onChange: (value: string | number | boolean) => updateUIAppearance({ accentColor: String(value) }),
          options: [] as Array<{ label: string; value: string }>
        });
        return;
      }

      if (control.settingId === 'ui.baseFontSize') {
        appearanceRendererFields.push({
          key: control.id,
          type: 'range' as const,
          label: (control.id === 'ui-base-font-size' ? 'Base Font Size' : 'Base Font Size') + ` (${baseFontSize}px)`,
          value: baseFontSize,
          onChange: (value: string | number | boolean) => updateUIAppearance({ baseFontSize: Number(value) }),
          min: 12,
          max: 20,
          step: 1,
          width: '110px'
        });
        return;
      }

      if (control.settingId === 'ui.density') {
        appearanceRendererFields.push({
          key: control.id,
          type: 'select' as const,
          label: control.id === 'ui-density-setting' ? 'Density' : 'Density',
          value: density,
          onChange: (value: string | number | boolean) => updateUIAppearance({ density: value as 'compact' | 'comfortable' | 'spacious' }),
          options: [
            { label: 'Compact', value: 'compact' },
            { label: 'Comfortable', value: 'comfortable' },
            { label: 'Spacious', value: 'spacious' }
          ]
        });
        return;
      }

      if (control.settingId === 'ui.fontFamily') {
        appearanceRendererFields.push({
          key: control.id,
          type: 'select' as const,
          label: control.id === 'ui-font-family' ? 'App Font' : 'App Font',
          value: fontFamily,
          onChange: (value: string | number | boolean) => updateUIAppearance({ fontFamily: String(value) }),
          options: fontOptions.map(option => ({ label: option.label, value: option.value }))
        });
        return;
      }

      if (control.settingId === 'ui.showTipsBoard') {
        appearanceRendererFields.push({
          key: control.id,
          type: 'checkbox' as const,
          label: 'Show Tips Board',
          value: showTipsBoard,
          onChange: (value: string | number | boolean) => updateUIAppearance({ showTipsBoard: Boolean(value) })
        });
        return;
      }

      if (control.settingId === 'ui.tipsRotationSeconds') {
        appearanceRendererFields.push({
          key: control.id,
          type: 'range' as const,
          label: `Tip Rotation (${tipsRotationSeconds}s)`,
          value: tipsRotationSeconds,
          onChange: (value: string | number | boolean) => updateUIAppearance({ tipsRotationSeconds: Number(value) }),
          min: 3,
          max: 60,
          step: 1,
          width: '110px'
        });
      }
    });
  });

  const settingsSections: SettingsBuilderSection[] = [
    {
      id: 'settings-lets-play',
      title: letsPlayTemplate?.label ?? "Let's Play!",
      description: letsPlayTemplate?.sections[0]?.label ?? 'Match Setup',
      fields: [],
      childLinks: getTemplateChildLinks('settings-lets-play'),
      manualContent: null
    },
    {
      id: 'settings-environment',
      title: environmentTemplate?.label ?? 'Environment',
      description: environmentTemplate?.sections[0]?.label ?? 'Look & Feel',
      fields: [],
      childLinks: getTemplateChildLinks('settings-environment'),
      manualContent: null
    },
    {
      id: 'settings-tools',
      title: toolsTemplate?.label ?? 'Tools',
      description: toolsTemplate?.sections[0]?.label ?? 'Utility Systems',
      fields: [],
      childLinks: getTemplateChildLinks('settings-tools'),
      manualContent: null
    },
    {
      id: 'settings-advanced',
      title: advancedTemplate?.label ?? 'Advanced',
      description: advancedTemplate?.sections[0]?.label ?? 'Power Tools',
      fields: [],
      childLinks: getTemplateChildLinks('settings-advanced'),
      manualContent: null
    },
    {
      id: 'time',
      title: timeTemplate?.label ?? 'Time Settings',
      description: timeBasicSection?.label ?? 'Basic',
      marginBottom: '0',
      fields: timeRendererFields,
      childLinks: timeChildTemplate ? [{ id: timeChildTemplate.id, label: timeChildTemplate.label }] : [],
      manualContent: (
        <>
          <SettingsFieldShell alignItems="flex-start" gap="12px">
            <span style={{ fontSize: '0.85rem' }}>
              {timerInitialTimeControl?.id === 'timer-initial-time' ? 'Initial Time' : 'Initial Time'}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: '#666' }}>
                <span>Minutes</span>
                <input
                  type="number"
                  min="0"
                  max="180"
                  step="1"
                  value={initialMinutes}
                  onChange={(e) => updateInitialTime(parseInt(e.target.value, 10) || 0, initialSeconds)}
                  style={{ width: '58px', padding: '4px', fontSize: '0.8rem' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: '#666' }}>
                <span>Seconds</span>
                <input
                  type="number"
                  min="0"
                  max="59.9"
                  step="0.1"
                  value={initialSeconds}
                  onChange={(e) => updateInitialTime(initialMinutes, parseFloat(e.target.value) || 0)}
                  style={{ width: '64px', padding: '4px', fontSize: '0.8rem' }}
                />
              </label>
            </div>
          </SettingsFieldShell>

          {timeAdvancedSection && (
            <div style={{ fontSize: '0.75rem', color: '#7f8c8d', borderTop: '1px solid #e5e7eb', paddingTop: '10px' }}>
              {timeAdvancedSection.label}
            </div>
          )}
        </>
      )
    },
    {
      id: 'play-game-mode',
      title: getRegisteredSettingsTemplate('play-game-mode')?.label ?? 'Game Mode',
      description: getRegisteredSettingsTemplate('play-game-mode')?.sections[0]?.label ?? 'Game Mode',
      fields: [],
      manualContent: <div style={{ fontSize: '0.8rem', color: '#5d6d7e' }}>Game mode settings will appear here.</div>
    },
    {
      id: 'play-opponent',
      title: getRegisteredSettingsTemplate('play-opponent')?.label ?? 'Opponent',
      description: getRegisteredSettingsTemplate('play-opponent')?.sections[0]?.label ?? 'Opponent',
      fields: [],
      manualContent: <div style={{ fontSize: '0.8rem', color: '#5d6d7e' }}>Opponent settings will appear here.</div>
    },
    {
      id: timeChildTemplate?.id ?? 'timer-clock-behavior',
      title: timeChildTemplate?.label ?? 'Clock Behavior',
      description: timeChildSection?.label ?? 'Clock Behavior',
      fields: timeChildRendererFields,
      manualContent: (
        <div style={{ fontSize: '0.8rem', color: '#5d6d7e' }}>
          Clock behavior settings will appear here.
        </div>
      )
    },
    {
      id: 'platform-ui-appearance',
      wrapperStyle: { borderTop: '1px solid #e5e7eb', paddingTop: '14px' } as React.CSSProperties,
      title: appearanceTemplate?.label ?? 'Look',
      description: appearanceTypographySection?.label ?? 'Typography',
      fields: appearanceRendererFields,
      manualContent: (
        <>
          {appearanceColorSection && (
            <div style={{ fontSize: '0.75rem', color: '#7f8c8d', borderTop: '1px solid #e5e7eb', paddingTop: '10px' }}>
              {appearanceColorSection.label}
            </div>
          )}

          {appearanceDensitySection && (
            <div style={{ fontSize: '0.75rem', color: '#7f8c8d' }}>
              {appearanceDensitySection.label}
            </div>
          )}

          {appearanceTipsSection && (
            <div style={{ fontSize: '0.75rem', color: '#7f8c8d' }}>
              {appearanceTipsSection.label}
            </div>
          )}
        </>
      )
    },
    {
      id: 'environment-look',
      title: getRegisteredSettingsTemplate('environment-look')?.label ?? 'Look',
      description: getRegisteredSettingsTemplate('environment-look')?.sections[0]?.label ?? 'Visual Settings',
      fields: [],
      childLinks: getTemplateChildLinks('environment-look'),
      manualContent: null
    },
    {
      id: 'environment-pieces',
      title: getRegisteredSettingsTemplate('environment-pieces')?.label ?? 'Pieces',
      description: getRegisteredSettingsTemplate('environment-pieces')?.sections[0]?.label ?? 'Piece Editor',
      fields: [],
      customPanel: getCustomPanelContent('environment-pieces')
    },
    {
      id: 'environment-sound',
      title: getRegisteredSettingsTemplate('environment-sound')?.label ?? 'Sound',
      description: getRegisteredSettingsTemplate('environment-sound')?.sections[0]?.label ?? 'Sound',
      fields: [],
      manualContent: <div style={{ fontSize: '0.8rem', color: '#5d6d7e' }}>Sound settings will appear here.</div>
    },
    {
      id: 'tools-chat-behavior',
      title: getRegisteredSettingsTemplate('tools-chat-behavior')?.label ?? 'Chat Behavior',
      description: getRegisteredSettingsTemplate('tools-chat-behavior')?.sections[0]?.label ?? 'Chat Behavior',
      fields: [],
      manualContent: <div style={{ fontSize: '0.8rem', color: '#5d6d7e' }}>Chat behavior settings will appear here.</div>
    },
    {
      id: 'tools-analysis',
      title: getRegisteredSettingsTemplate('tools-analysis')?.label ?? 'Analysis',
      description: getRegisteredSettingsTemplate('tools-analysis')?.sections[0]?.label ?? 'Analysis',
      fields: [],
      manualContent: <div style={{ fontSize: '0.8rem', color: '#5d6d7e' }}>Analysis settings will appear here.</div>
    },
    {
      id: 'tools-history',
      title: getRegisteredSettingsTemplate('tools-history')?.label ?? 'History',
      description: getRegisteredSettingsTemplate('tools-history')?.sections[0]?.label ?? 'History',
      fields: [],
      manualContent: <div style={{ fontSize: '0.8rem', color: '#5d6d7e' }}>History settings will appear here.</div>
    },
    {
      id: 'tools-stats',
      title: getRegisteredSettingsTemplate('tools-stats')?.label ?? 'Stats',
      description: getRegisteredSettingsTemplate('tools-stats')?.sections[0]?.label ?? 'Stats',
      fields: [],
      manualContent: <div style={{ fontSize: '0.8rem', color: '#5d6d7e' }}>Stats settings will appear here.</div>
    },
    {
      id: 'advanced-event-system',
      title: getRegisteredSettingsTemplate('advanced-event-system')?.label ?? 'System',
      description: getRegisteredSettingsTemplate('advanced-event-system')?.sections[0]?.label ?? 'System Tools',
      fields: [],
      childLinks: getTemplateChildLinks('advanced-event-system'),
      manualContent: <div style={{ fontSize: '0.8rem', color: '#5d6d7e' }}>System tools and package settings live here.</div>
    },
    {
      id: 'advanced-validation',
      title: getRegisteredSettingsTemplate('advanced-validation')?.label ?? 'Validation',
      description: getRegisteredSettingsTemplate('advanced-validation')?.sections[0]?.label ?? 'Validation',
      fields: [],
      manualContent: <div style={{ fontSize: '0.8rem', color: '#5d6d7e' }}>Validation settings will appear here.</div>
    },
    {
      id: 'advanced-import-export',
      title: getRegisteredSettingsTemplate('advanced-import-export')?.label ?? 'Import / Export',
      description: getRegisteredSettingsTemplate('advanced-import-export')?.sections[0]?.label ?? 'Import / Export',
      fields: [],
      manualContent: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '0.8rem', color: '#5d6d7e' }}>
            Prepare the current experience as a shareable .zip package with selected settings and real media files.
          </div>
          <button
            onClick={prepareExperiencePackage}
            disabled={isPreparingPackage}
            style={{
              alignSelf: 'flex-start',
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #d0d7de',
              background: isPreparingPackage ? '#f1f5f9' : '#fff',
              color: '#2c3e50',
              cursor: isPreparingPackage ? 'not-allowed' : 'pointer',
              fontSize: '0.8rem'
            }}
          >
            {isPreparingPackage ? 'Preparing Package...' : 'Prepare Package'}
          </button>
          {packagePrepareStatus && (
            <div style={{ fontSize: '0.75rem', color: preparedPackageBlob ? '#1f7a1f' : '#5d6d7e' }}>
              {packagePrepareStatus}
            </div>
          )}
          {preparedPackageBlob && (
            <button
              onClick={savePreparedExperiencePackage}
              style={{
                alignSelf: 'flex-start',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #16a34a',
                background: '#f0fdf4',
                color: '#166534',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 700
              }}
            >
              Save Package
            </button>
          )}
          <div style={{ fontSize: '0.8rem', color: '#5d6d7e' }}>
            Select an experience package .zip or compatible JSON file to validate it before import.
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => document.getElementById('experience-package-import-input')?.click()}
              style={{
                alignSelf: 'flex-start',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #d0d7de',
                background: '#fff',
                color: '#2c3e50',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              Validate Experience Package
            </button>
            <input
              id="experience-package-import-input"
              type="file"
              accept=".json,.zip,application/json,application/zip"
              onChange={handleExperiencePackageImportSelection}
              style={{ display: 'none' }}
            />
            {importValidationMessage && (
              <div style={{ fontSize: '0.75rem', color: importValidationMessage.startsWith('Valid') ? '#1f7a1f' : '#b42318' }}>
                {importValidationMessage}
              </div>
            )}
          </div>
          {validatedImportPackage && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #d0d7de',
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#2c3e50' }}>
                Package Preview
              </div>
              <div style={{ fontSize: '0.75rem', color: '#5d6d7e' }}>
                Name: {validatedImportPackage.metadata.name}
              </div>
              {validatedImportPackage.metadata.author && (
                <div style={{ fontSize: '0.75rem', color: '#5d6d7e' }}>
                  Author: {validatedImportPackage.metadata.author}
                </div>
              )}
              <div style={{ fontSize: '0.75rem', color: '#5d6d7e' }}>
                Version: {validatedImportPackage.metadata.version}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#5d6d7e' }}>
                Sections: {Object.keys(validatedImportPackage.contents).join(', ')}
              </div>
              <button
                onClick={applyExperiencePackage}
                style={{
                  alignSelf: 'flex-start',
                  marginTop: '4px',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #d0d7de',
                  background: '#fff',
                  color: '#2c3e50',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                Apply Package
              </button>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'advanced-settings-builder',
      title: getRegisteredSettingsTemplate('advanced-settings-builder')?.label ?? 'Settings Builder',
      description: getRegisteredSettingsTemplate('advanced-settings-builder')?.sections[0]?.label ?? 'Settings Builder',
      fields: [],
      manualContent: <div style={{ fontSize: '0.8rem', color: '#5d6d7e' }}>Settings Builder tools will appear here.</div>
    }
  ];

  const unsupportedFields = settingsSections.flatMap(section =>
    (section.fields ?? [])
      .filter(field => !isSupportedFieldType(field.type))
      .map(field => `${section.id}: ${field.key} (${field.type})`)
  );

  return (
    <div className="view-container cu-view-shell">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveSection('settings-lets-play')}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: activeSection === 'settings-lets-play' ? '1px solid #2c3e50' : '1px solid #d0d7de',
              background: activeSection === 'settings-lets-play' ? '#2c3e50' : '#fff',
              color: activeSection === 'settings-lets-play' ? '#fff' : '#2c3e50',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600
            }}
          >
            {letsPlayTemplate?.label ?? "Let's Play!"}
          </button>
          <button
            onClick={() => setActiveSection('settings-environment')}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: activeSection === 'settings-environment' ? '1px solid #2c3e50' : '1px solid #d0d7de',
              background: activeSection === 'settings-environment' ? '#2c3e50' : '#fff',
              color: activeSection === 'settings-environment' ? '#fff' : '#2c3e50',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600
            }}
          >
            {environmentTemplate?.label ?? 'Environment'}
          </button>
          <button
            onClick={() => setActiveSection('settings-tools')}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: activeSection === 'settings-tools' ? '1px solid #2c3e50' : '1px solid #d0d7de',
              background: activeSection === 'settings-tools' ? '#2c3e50' : '#fff',
              color: activeSection === 'settings-tools' ? '#fff' : '#2c3e50',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600
            }}
          >
            {toolsTemplate?.label ?? 'Tools'}
          </button>
          <button
            onClick={() => setActiveSection('settings-advanced')}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: activeSection === 'settings-advanced' ? '1px solid #2c3e50' : '1px solid #d0d7de',
              background: activeSection === 'settings-advanced' ? '#2c3e50' : '#fff',
              color: activeSection === 'settings-advanced' ? '#fff' : '#2c3e50',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600
            }}
          >
            {advancedTemplate?.label ?? 'Advanced'}
          </button>
        </div>
        {unsupportedFields.length > 0 && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #f1c40f',
              background: '#fff8db',
              color: '#7d6608',
              fontSize: '0.75rem'
            }}
          >
            Unsupported settings fields: {unsupportedFields.join(', ')}
          </div>
        )}
        <SettingsBuilder activeSection={activeSection} sections={settingsSections} />
      </div>
    </div>
  );
};

export default SettingsPanelShellView;
