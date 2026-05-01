import React, { useMemo, useState } from 'react';
import JSZip from 'jszip';
import { useAudio } from '../context/AudioContext';
import { useSettings } from '../context/SettingsContext';
import {
  buildExperiencePackage,
  createExperiencePackageZip,
  readExperiencePackageZip,
  validateExperiencePackage,
  type ExperiencePackage,
  type ExperiencePackageContents
} from '../packages/ExperiencePackage';
import { PACKAGE_CATEGORIES, unwrapPackageInput } from '../registry/PackageRegistry';
import { validateCustomRuleset } from '../rules/RulePackages';
import { getCustomEventStatus } from '../events/CustomEventRuntime';

interface ImportExportViewProps {
  closeOverlay?: () => void;
}

type ImportKind = 'experience' | 'theme';

type PendingImport = {
  kind: ImportKind;
  name: string;
  version?: string;
  contents: ExperiencePackageContents;
  source: unknown;
  file?: File;
  requiresAssetHydration?: boolean;
};

type PackageCategoryId = keyof ExperiencePackageContents;

type PackageCategoryManifestItem = {
  id: PackageCategoryId;
  label: string;
  description: string;
  exportable: boolean;
  applySupported: boolean;
};

const PACKAGE_CATEGORY_MANIFEST: PackageCategoryManifestItem[] = [
  { id: 'template', label: 'Visuals / Board / Pieces', description: 'Applied template, board layers, piece sets, and visual setup.', exportable: true, applySupported: true },
  { id: 'uiAppearance', label: 'UI Appearance', description: 'Platform colors, density, tips board, and interface preferences.', exportable: true, applySupported: true },
  { id: 'timeControl', label: 'Timer', description: 'Reusable timer setup. Current countdown state belongs to Game Snapshot, not packages.', exportable: true, applySupported: true },
  { id: 'audioSettings', label: 'Audio Settings', description: 'Volume, controller, mute, and playback mode settings.', exportable: true, applySupported: true },
  { id: 'soundLibrary', label: 'Sound Library', description: 'Reusable uploaded sound files and sound assets.', exportable: true, applySupported: true },
  { id: 'soundRules', label: 'Sound Rules', description: 'Event-to-sound rule definitions.', exportable: true, applySupported: true },
  { id: 'audioPlaylists', label: 'Audio Playlists', description: 'Background music playlist and selected track metadata.', exportable: true, applySupported: true },
  { id: 'customEvents', label: 'Custom Events', description: 'Event Builder definitions used by Sound Rules and Event Log.', exportable: true, applySupported: true },
  { id: 'animationDefinitions', label: 'Animation Definitions', description: 'Animation Builder presets callable by custom events.', exportable: true, applySupported: true },
  { id: 'animationRules', label: 'Event Animation Rules', description: 'Links custom events to named Animation Builder definitions.', exportable: true, applySupported: true },
  { id: 'customRulesets', label: 'Custom Rulesets / Custom Games', description: 'Approved reusable custom game definitions.', exportable: true, applySupported: true },
  { id: 'botSettings', label: 'Bot Settings', description: 'Bot behavior, difficulty, personality, and AI preferences.', exportable: true, applySupported: true },
  { id: 'registeredBots', label: 'Registered Bots', description: 'Custom bot registrations such as local worker engine paths.', exportable: true, applySupported: true },
  { id: 'chatSettings', label: 'Chat Settings', description: 'Chat layout and display preferences.', exportable: true, applySupported: true },
  { id: 'localProfile', label: 'Profile Identity', description: 'Local guest profile name, image, and guest identity.', exportable: true, applySupported: true },
  { id: 'multiplayerServer', label: 'Multiplayer Server Settings', description: 'Home/custom multiplayer server source settings.', exportable: true, applySupported: true },
  { id: 'compliancePolicy', label: 'Compliance Policy', description: 'Host-forced multiplayer category policy. Active room policy is runtime-managed for now.', exportable: false, applySupported: false },
  { id: 'rules', label: 'Rules Mode', description: 'Standard/variant mode and training wheels settings.', exportable: true, applySupported: true },
  { id: 'audio', label: 'Audio Profile (Legacy)', description: 'Older full audio profile package category.', exportable: false, applySupported: true },
  { id: 'personalityProfiles', label: 'Bot Personalities', description: 'Saved bot personality profiles and chat reactions.', exportable: true, applySupported: true }
];

const EXPERIENCE_CATEGORY_LABELS = PACKAGE_CATEGORY_MANIFEST.reduce((labels, item) => ({
  ...labels,
  [item.id]: item.label
}), {} as Record<PackageCategoryId, string>);

const DEFAULT_EXPORT_CATEGORIES: Array<keyof ExperiencePackageContents> = [
  'template',
  'uiAppearance',
  'timeControl',
  'chatSettings',
  'rules',
  'audioSettings',
  'soundLibrary',
  'soundRules',
  'audioPlaylists',
  'customEvents',
  'animationDefinitions',
  'animationRules',
  'botSettings',
  'registeredBots',
  'personalityProfiles',
  'localProfile',
  'multiplayerServer',
  'customRulesets'
];

const createThemeImport = (raw: any): PendingImport => {
  const data = unwrapPackageInput(raw);
  const contents: ExperiencePackageContents = {};
  const templateUpdates: Record<string, unknown> = {};
  const selectedCategories = Array.isArray(data.categories)
    ? data.categories
    : PACKAGE_CATEGORIES.map(category => category.id);

  PACKAGE_CATEGORIES.forEach(category => {
    if (!selectedCategories.includes(category.id)) return;
    category.keys.forEach(key => {
      if (data[key] !== undefined) templateUpdates[key] = data[key];
    });
  });

  if (Object.keys(templateUpdates).length > 0) {
    contents.template = templateUpdates as unknown as ExperiencePackageContents['template'];
  }
  if (data.audio) contents.audio = data.audio;

  return {
    kind: 'theme',
    name: data.name || data.metadata?.name || 'Imported Set',
    version: data.version || data.metadata?.version,
    contents,
    source: data
  };
};

const getFileText = async (file: File) => {
  if (file.name.toLowerCase().endsWith('.zip')) {
    const zip = await JSZip.loadAsync(file);
    const experienceContent = await zip.file('experience.json')?.async('string');
    if (experienceContent) return experienceContent;
    const themeContent = await zip.file('theme.json')?.async('string');
    if (themeContent) return themeContent;
    throw new Error('No supported package file found in zip.');
  }

  return file.text();
};

const ImportExportView: React.FC<ImportExportViewProps> = ({ closeOverlay }) => {
  const {
    settings,
    updateTemplate,
    updateUIAppearance,
    updateTimeControl,
    updateChatSettings,
    updateBotSettings,
    setGameMode,
    setTrainingWheels,
    setThemeDraft,
    importSettingsCategories
  } = useSettings();
  const { getCurrentProfile, applyProfile } = useAudio();
  const [mode, setMode] = useState<'landing' | 'import' | 'export'>('landing');
  const [message, setMessage] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [selectedImportCategories, setSelectedImportCategories] = useState<string[]>([]);
  const [selectedExportCategories, setSelectedExportCategories] = useState<string[]>(DEFAULT_EXPORT_CATEGORIES);

  const importCategoryOptions = useMemo(() => {
    if (!pendingImport) return [];
    return Object.keys(pendingImport.contents) as Array<keyof ExperiencePackageContents>;
  }, [pendingImport]);

  const getCategoryWarnings = (contents: ExperiencePackageContents, category: PackageCategoryId) => {
    const warnings: string[] = [];
    if (category === 'soundRules' && contents.soundRules) {
      const packageSoundIds = new Set([
        ...(contents.soundLibrary ?? []).map(sound => sound.id),
        ...(contents.audio?.library ?? []).map(sound => sound.id),
        ...getCurrentProfile().library.map(sound => sound.id)
      ]);
      const missingSounds = contents.soundRules.filter(rule => rule.soundId && !packageSoundIds.has(rule.soundId));
      if (missingSounds.length > 0) warnings.push(`${missingSounds.length} sound rule(s) reference sound files not included in this package.`);
    }
    if (category === 'customEvents' && contents.customEvents) {
      const invalidEvents = contents.customEvents.filter(eventDefinition => getCustomEventStatus(eventDefinition, settings.customEvents) === 'Invalid');
      if (invalidEvents.length > 0) warnings.push(`${invalidEvents.length} custom event(s) need review before they can run.`);
    }
    if (category === 'customRulesets' && contents.customRulesets) {
      const invalidRulesets = contents.customRulesets.filter(ruleset => !validateCustomRuleset(ruleset).valid);
      if (invalidRulesets.length > 0) warnings.push(`${invalidRulesets.length} custom game(s) need validation before play.`);
    }
    if (category === 'registeredBots' && contents.registeredBots?.some(bot => bot.type === 'worker' || bot.type === 'web')) {
      warnings.push('Worker/URL bots may require matching local engine files on this device.');
    }
    if (category === 'compliancePolicy') {
      warnings.push('Compliance policy import is prepared, but active multiplayer room policy is controlled by the host room.');
    }
    return warnings;
  };

  const importWarnings = useMemo(() => {
    if (!pendingImport) return [];
    return importCategoryOptions.flatMap(category =>
      getCategoryWarnings(pendingImport.contents, category).map(message => ({ category, message }))
    );
  }, [pendingImport, importCategoryOptions, settings.customEvents]);

  const toggleCategory = (categoryId: string, selected: string[], setSelected: (next: string[]) => void) => {
    setSelected(
      selected.includes(categoryId)
        ? selected.filter(id => id !== categoryId)
        : [...selected, categoryId]
    );
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setMessage('Validating package...');
    setPendingImport(null);

    try {
      const text = await getFileText(file);
      const parsed = JSON.parse(text);
      const validation = validateExperiencePackage(parsed);

      if (validation.valid) {
        const experiencePackage = parsed as ExperiencePackage;
        const nextImport: PendingImport = {
          kind: 'experience',
          name: experiencePackage.metadata.name,
          version: experiencePackage.metadata.version,
          contents: experiencePackage.contents,
          source: experiencePackage,
          file: file.name.toLowerCase().endsWith('.zip') ? file : undefined,
          requiresAssetHydration: file.name.toLowerCase().endsWith('.zip') && !!experiencePackage.assetManifest?.assets.length
        };
        setPendingImport(nextImport);
        setSelectedImportCategories(Object.keys(nextImport.contents).filter(categoryId =>
          PACKAGE_CATEGORY_MANIFEST.some(category => category.id === categoryId && category.applySupported)
        ));
        setMessage('Package is valid. Preview contents before applying.');
        return;
      }

      const themeImport = createThemeImport(parsed);
      if (Object.keys(themeImport.contents).length === 0) {
        setMessage(`Invalid package: ${validation.issues.join(' ')}`);
        return;
      }

      setPendingImport(themeImport);
      setSelectedImportCategories(Object.keys(themeImport.contents).filter(categoryId =>
        PACKAGE_CATEGORY_MANIFEST.some(category => category.id === categoryId && category.applySupported)
      ));
      setMessage('Theme package is valid. Preview contents before applying.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to read selected package.');
    }
  };

  const applyPackage = async () => {
    if (!pendingImport) return;
    let activeImport = pendingImport;
    if (pendingImport.requiresAssetHydration && pendingImport.file) {
      try {
        const hydrated = await readExperiencePackageZip(pendingImport.file, { loadAssets: true });
        activeImport = {
          ...pendingImport,
          contents: hydrated.package.contents,
          source: hydrated.package
        };
        if (hydrated.warnings.length > 0) {
          setMessage(`Package applied with asset warnings: ${hydrated.warnings.join(' ')}`);
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Failed to load package assets.');
        return;
      }
    }
    const { contents } = activeImport;

    if (selectedImportCategories.includes('template') && contents.template) updateTemplate(contents.template);
    if (selectedImportCategories.includes('uiAppearance') && contents.uiAppearance) updateUIAppearance(contents.uiAppearance);
    if (selectedImportCategories.includes('timeControl') && contents.timeControl) updateTimeControl(contents.timeControl);
    if (selectedImportCategories.includes('chatSettings') && contents.chatSettings) updateChatSettings(contents.chatSettings);
    if (selectedImportCategories.includes('botSettings') && contents.botSettings) updateBotSettings(contents.botSettings);
    if (selectedImportCategories.includes('rules') && contents.rules) {
      setGameMode(contents.rules.gameMode);
      setTrainingWheels(contents.rules.trainingWheels);
    }
    let nextAudioProfile = selectedImportCategories.includes('audio') && contents.audio
      ? contents.audio
      : getCurrentProfile();
    if (selectedImportCategories.includes('audioSettings') && contents.audioSettings) {
      nextAudioProfile = { ...nextAudioProfile, ...contents.audioSettings };
    }
    if (selectedImportCategories.includes('soundLibrary') && contents.soundLibrary) {
      nextAudioProfile = { ...nextAudioProfile, library: contents.soundLibrary };
    }
    if (selectedImportCategories.includes('soundRules') && contents.soundRules) {
      nextAudioProfile = { ...nextAudioProfile, rules: contents.soundRules };
    }
    if (selectedImportCategories.includes('audioPlaylists') && contents.audioPlaylists) {
      nextAudioProfile = { ...nextAudioProfile, ...contents.audioPlaylists };
    }
    if (
      (selectedImportCategories.includes('audio') && contents.audio) ||
      (selectedImportCategories.includes('audioSettings') && contents.audioSettings) ||
      (selectedImportCategories.includes('soundLibrary') && contents.soundLibrary) ||
      (selectedImportCategories.includes('soundRules') && contents.soundRules) ||
      (selectedImportCategories.includes('audioPlaylists') && contents.audioPlaylists)
    ) {
      applyProfile(nextAudioProfile);
    }
    importSettingsCategories({
      ...(selectedImportCategories.includes('personalityProfiles') && contents.personalityProfiles ? { personalityProfiles: contents.personalityProfiles } : {}),
      ...(selectedImportCategories.includes('registeredBots') && contents.registeredBots ? { registeredBots: contents.registeredBots } : {}),
      ...(selectedImportCategories.includes('localProfile') && contents.localProfile ? { localProfile: contents.localProfile } : {}),
      ...(selectedImportCategories.includes('multiplayerServer') && contents.multiplayerServer ? { multiplayerServer: contents.multiplayerServer } : {}),
      ...(selectedImportCategories.includes('customRulesets') && contents.customRulesets ? { customRulesets: contents.customRulesets } : {}),
      ...(selectedImportCategories.includes('customEvents') && contents.customEvents ? { customEvents: contents.customEvents } : {}),
      ...(selectedImportCategories.includes('animationDefinitions') && contents.animationDefinitions ? { animationDefinitions: contents.animationDefinitions } : {}),
      ...(selectedImportCategories.includes('animationRules') && contents.animationRules ? { animationRules: contents.animationRules } : {})
    });
    setThemeDraft(null);
    setMessage(`Applied package: ${activeImport.name}`);
    setPendingImport(null);
    closeOverlay?.();
  };

  const exportPackage = async () => {
    const experiencePackage = buildExperiencePackage(settings, {
      audio: getCurrentProfile()
    });
    const contents = Object.fromEntries(
      Object.entries(experiencePackage.contents).filter(([key]) => selectedExportCategories.includes(key))
    ) as ExperiencePackageContents;
    const exportPackage: ExperiencePackage = {
      ...experiencePackage,
      contents
    };
    const validation = validateExperiencePackage(exportPackage);
    if (!validation.valid) {
      setMessage(`Export blocked: ${validation.issues.join(' ')}`);
      return;
    }

    let blob: Blob;
    try {
      blob = await createExperiencePackageZip(exportPackage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to prepare package assets.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'chess-unleashed-experience.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setMessage('Export package downloaded.');
  };

  const renderCategoryChecklist = (
    categories: PackageCategoryManifestItem[],
    selected: string[],
    setSelected: (next: string[]) => void,
    includedCategories?: PackageCategoryId[]
  ) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {categories.map(category => {
        const included = includedCategories ? includedCategories.includes(category.id) : true;
        const disabled = !category.applySupported || !included;
        return (
          <label key={category.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.78rem', color: disabled ? '#94a3b8' : '#334155' }}>
            <input
              type="checkbox"
              checked={selected.includes(category.id)}
              disabled={disabled}
              onChange={() => toggleCategory(category.id, selected, setSelected)}
              style={{ marginTop: 2 }}
            />
            <span>
              <span style={{ fontWeight: 700 }}>{category.label}</span>
              <span style={{ marginLeft: 6, fontSize: '0.68rem' }}>
                {!category.applySupported ? 'Unsupported' : included ? 'Included' : 'Not included'}
              </span>
              <span style={{ display: 'block', fontSize: '0.68rem', color: disabled ? '#94a3b8' : '#64748b' }}>
                {category.description}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );

  return (
    <div className="view-container">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {mode === 'landing' && (
          <>
            <button type="button" onClick={() => setMode('import')} style={{ padding: '12px', borderRadius: 8, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', textAlign: 'left', fontWeight: 700 }}>
              Import Package
              <div style={{ marginTop: '4px', fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>Choose a .json or .zip package, validate it, preview contents, then apply it.</div>
            </button>
            <button type="button" onClick={() => setMode('export')} style={{ padding: '12px', borderRadius: 8, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', textAlign: 'left', fontWeight: 700 }}>
              Export Package
              <div style={{ marginTop: '4px', fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>Choose what to include, validate it, and download a shareable package.</div>
            </button>
          </>
        )}

        {mode === 'import' && (
          <>
            <button type="button" onClick={() => setMode('landing')} style={{ alignSelf: 'flex-start', padding: '6px 10px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer' }}>Back</button>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Import Package</h3>
            <input type="file" accept=".json,.zip,application/json,application/zip" onChange={handleImportFile} />
            {pendingImport && (
              <div style={{ padding: '12px', borderRadius: 8, border: '1px solid #d0d7de', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#2c3e50' }}>Preview Contents</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Name: {pendingImport.name}</div>
                  {pendingImport.version && <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Version: {pendingImport.version}</div>}
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Type: {pendingImport.kind === 'experience' ? 'Experience Package' : 'Theme Package'}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '6px' }}>Choose categories to load</div>
                  {renderCategoryChecklist(PACKAGE_CATEGORY_MANIFEST, selectedImportCategories, setSelectedImportCategories, importCategoryOptions)}
                </div>
                {importWarnings.length > 0 && (
                  <div style={{ padding: '8px', borderRadius: 6, border: '1px solid #facc15', background: '#fefce8', color: '#854d0e', fontSize: '0.72rem' }}>
                    <strong>Compatibility notes</strong>
                    <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                      {importWarnings.map((warning, index) => (
                        <li key={`${warning.category}-${index}`}>
                          {EXPERIENCE_CATEGORY_LABELS[warning.category]}: {warning.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <button type="button" onClick={applyPackage} disabled={selectedImportCategories.length === 0} style={{ alignSelf: 'flex-start', padding: '8px 12px', borderRadius: 6, border: '1px solid #2c3e50', background: selectedImportCategories.length ? '#2c3e50' : '#94a3b8', color: '#fff', cursor: selectedImportCategories.length ? 'pointer' : 'not-allowed', fontWeight: 700 }}>
                  Apply Package
                </button>
              </div>
            )}
          </>
        )}

        {mode === 'export' && (
          <>
            <button type="button" onClick={() => setMode('landing')} style={{ alignSelf: 'flex-start', padding: '6px 10px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer' }}>Back</button>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Export Package</h3>
            <div style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d0d7de', background: '#f8fafc', color: '#475569', fontSize: '0.72rem' }}>
              Experience packages save reusable setup and assets. Current board position, turn, move history, timers in progress, and game results are saved only by Game Snapshot resume.
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '6px' }}>Choose categories to include</div>
              {renderCategoryChecklist(
                PACKAGE_CATEGORY_MANIFEST.filter(category => category.exportable && DEFAULT_EXPORT_CATEGORIES.includes(category.id)),
                selectedExportCategories,
                setSelectedExportCategories
              )}
            </div>
            <button type="button" onClick={exportPackage} disabled={selectedExportCategories.length === 0} style={{ alignSelf: 'flex-start', padding: '8px 12px', borderRadius: 6, border: '1px solid #2c3e50', background: selectedExportCategories.length ? '#2c3e50' : '#94a3b8', color: '#fff', cursor: selectedExportCategories.length ? 'pointer' : 'not-allowed', fontWeight: 700 }}>
              Export Package
            </button>
          </>
        )}

        {message && (
          <div style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d0d7de', background: '#f8fafc', color: '#334155', fontSize: '0.76rem' }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportExportView;
