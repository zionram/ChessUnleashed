import React, { useMemo, useState } from 'react';
import JSZip from 'jszip';
import { useAudio } from '../context/AudioContext';
import { useSettings } from '../context/SettingsContext';
import {
  buildExperiencePackage,
  createExperiencePackageZip,
  createExtractedExperiencePackageZip,
  readExperiencePackageExtractPreview,
  readExperiencePackageZip,
  validateExperiencePackage,
  type ExperiencePackageExtractPreview,
  type ExperiencePackage,
  type ExperiencePackageContents
} from '../packages/ExperiencePackage';
import type { ImportedAssetRegistryEntry } from '../electron-assets';
import { PACKAGE_CATEGORIES, unwrapPackageInput } from '../registry/PackageRegistry';
import { validateCustomRuleset } from '../rules/RulePackages';
import { getCustomEventStatus } from '../events/CustomEventRuntime';
import { addErrorLogEntry } from '../utils/ErrorLog';

interface ImportExportViewProps {
  closeOverlay?: () => void;
}

type ImportKind = 'experience' | 'theme';
type PackageManagerMode = 'landing' | 'import' | 'export' | 'extract';

type PendingImport = {
  kind: ImportKind;
  name: string;
  version?: string;
  contents: ExperiencePackageContents;
  source: unknown;
  file?: File;
  requiresAssetHydration?: boolean;
  importedAssets?: ImportedAssetRegistryEntry[];
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
  const [mode, setMode] = useState<PackageManagerMode>('landing');
  const [message, setMessage] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [selectedImportCategories, setSelectedImportCategories] = useState<string[]>([]);
  const [selectedExportCategories, setSelectedExportCategories] = useState<string[]>(DEFAULT_EXPORT_CATEGORIES);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<{ current?: number; total?: number } | null>(null);
  const [isLoadingPackage, setIsLoadingPackage] = useState(false);
  const [prepareStatus, setPrepareStatus] = useState<string | null>(null);
  const [prepareProgress, setPrepareProgress] = useState<{ current?: number; total?: number } | null>(null);
  const [isPreparingPackage, setIsPreparingPackage] = useState(false);
  const [preparedPackage, setPreparedPackage] = useState<{ blob: Blob; categories: string[]; size: number } | null>(null);
  const [extractFile, setExtractFile] = useState<File | null>(null);
  const [extractPreview, setExtractPreview] = useState<ExperiencePackageExtractPreview | null>(null);
  const [extractStatus, setExtractStatus] = useState<string | null>(null);
  const [extractProgress, setExtractProgress] = useState<{ current?: number; total?: number } | null>(null);
  const [isExtractingPackage, setIsExtractingPackage] = useState(false);
  const [preparedExtract, setPreparedExtract] = useState<{ blob: Blob; warnings: string[]; packageName: string; size: number } | null>(null);

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
    if (setSelected === setSelectedExportCategories) {
      setPreparedPackage(null);
      setPrepareStatus(null);
      setPrepareProgress(null);
    }
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

    console.info('[Package Manager] Load package file selected:', file.name, file.type || 'unknown type', file.size);
    setMessage(`Reading package: ${file.name}`);
    setImportStatus('Selected file received');
    setImportProgress({ current: 1, total: 4 });
    setIsLoadingPackage(true);
    setPendingImport(null);
    setSelectedImportCategories([]);

    try {
      const isZip = file.name.toLowerCase().endsWith('.zip');
      let parsedPackage: ExperiencePackage | null = null;
      let themeImport: PendingImport | null = null;

      if (isZip) {
        setImportStatus('Parsing zip package');
        setImportProgress({ current: 2, total: 4 });
        try {
          const zipImport = await readExperiencePackageZip(file, { loadAssets: false });
          parsedPackage = zipImport.package;
          const validation = validateExperiencePackage(parsedPackage);

          if (validation.valid) {
            setImportStatus('Package preview ready');
            setImportProgress({ current: 3, total: 4 });
            const nextImport: PendingImport = {
              kind: 'experience',
              name: parsedPackage.metadata.name,
              version: parsedPackage.metadata.version,
              contents: parsedPackage.contents,
              source: parsedPackage,
              file,
              requiresAssetHydration: !!parsedPackage.assetManifest?.assets.length
            };
            setPendingImport(nextImport);
            setSelectedImportCategories(Object.keys(nextImport.contents).filter(categoryId =>
              PACKAGE_CATEGORY_MANIFEST.some(category => category.id === categoryId && category.applySupported)
            ));
            setImportStatus('Package ready');
            setImportProgress({ current: 4, total: 4 });
            setMessage(parsedPackage.assetManifest?.assets.length
              ? 'Package is valid. Preview contents before applying. Assets will hydrate when you apply.'
              : 'Package is valid. Preview contents before applying.');
            console.info('[Package Manager] Experience package preview ready:', parsedPackage.metadata.name);
            return;
          }
          console.warn('[Package Manager] Experience package validation failed:', validation.issues);
        } catch (zipError) {
          console.warn('[Package Manager] Experience package read failed, trying legacy package fallback:', zipError);
        }
      }

      setImportStatus(isZip ? 'Reading legacy package data' : 'Reading package JSON');
      const text = await getFileText(file);
      setImportProgress({ current: 2, total: 4 });
      const parsed = JSON.parse(text);
      setImportStatus('Validating package contents');
      const validation = validateExperiencePackage(parsed);

      if (validation.valid) {
        const experiencePackage = parsed as ExperiencePackage;
        const nextImport: PendingImport = {
          kind: 'experience',
          name: experiencePackage.metadata.name,
          version: experiencePackage.metadata.version,
          contents: experiencePackage.contents,
          source: experiencePackage,
          file: isZip ? file : undefined,
          requiresAssetHydration: isZip && !!experiencePackage.assetManifest?.assets.length
        };
        setPendingImport(nextImport);
        setSelectedImportCategories(Object.keys(nextImport.contents).filter(categoryId =>
          PACKAGE_CATEGORY_MANIFEST.some(category => category.id === categoryId && category.applySupported)
        ));
        setImportStatus('Package preview ready');
        setImportProgress({ current: 3, total: 4 });
        setMessage('Package is valid. Preview contents before applying.');
        console.info('[Package Manager] JSON package preview ready:', experiencePackage.metadata.name);
        return;
      }

      themeImport = createThemeImport(parsed);
      if (Object.keys(themeImport.contents).length === 0) {
        setMessage(`Invalid package: ${validation.issues.join(' ')}`);
        setImportStatus('Package could not be loaded');
        return;
      }

      setPendingImport(themeImport);
      setSelectedImportCategories(Object.keys(themeImport.contents).filter(categoryId =>
        PACKAGE_CATEGORY_MANIFEST.some(category => category.id === categoryId && category.applySupported)
      ));
      setImportStatus('Theme package preview ready');
      setImportProgress({ current: 4, total: 4 });
      setMessage('Theme package is valid. Preview contents before applying.');
      console.info('[Package Manager] Legacy theme package preview ready:', themeImport.name);
    } catch (error) {
      const details = error instanceof Error ? error.message : 'Failed to read selected package.';
      console.error('[Package Manager] Load package failed:', error);
      setMessage(details);
      setImportStatus('Package load failed');
    }
    finally {
      setIsLoadingPackage(false);
    }
  };

  const applyPackage = async () => {
    if (!pendingImport) return;
    console.info('[Package Manager] Applying package:', pendingImport.name, selectedImportCategories);
    setMessage('Applying package...');
    setImportStatus('Applying selected categories');
    let activeImport = pendingImport;
    if (pendingImport.requiresAssetHydration && pendingImport.file) {
      try {
        setImportStatus('Hydrating selected assets');
        setImportProgress({ current: 1, total: 2 });
        const hydrated = await readExperiencePackageZip(pendingImport.file, { loadAssets: true });
        activeImport = {
          ...pendingImport,
          contents: hydrated.package.contents,
          source: hydrated.package,
          importedAssets: hydrated.importedAssets
        };
        if (hydrated.warnings.length > 0) {
          setMessage(`Package applied with asset warnings: ${hydrated.warnings.join(' ')}`);
        }
        setImportProgress({ current: 2, total: 2 });
      } catch (error) {
        const details = error instanceof Error ? error.message : 'Failed to load package assets.';
        console.error('[Package Manager] Package asset hydration failed:', error);
        setMessage(details);
        setImportStatus('Package apply failed');
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
      ...(selectedImportCategories.includes('animationRules') && contents.animationRules ? { animationRules: contents.animationRules } : {}),
      ...(activeImport.importedAssets?.length ? { importedAssets: activeImport.importedAssets } : {})
    });
    setThemeDraft(null);
    setMessage(`Applied package: ${activeImport.name}`);
    setImportStatus('Package loaded');
    console.info('[Package Manager] Package applied:', activeImport.name);
    setPendingImport(null);
    closeOverlay?.();
  };

  const prepareExportPackage = async () => {
    setPreparedPackage(null);
    setIsPreparingPackage(true);
    setPrepareStatus('Gathering selected settings');
    setPrepareProgress(null);
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
      setIsPreparingPackage(false);
      return;
    }

    try {
      const blob = await createExperiencePackageZip(exportPackage, {
        onProgress: progress => {
          setPrepareStatus(progress.message);
          setPrepareProgress({ current: progress.current, total: progress.total });
        }
      });
      setPreparedPackage({ blob, categories: [...selectedExportCategories], size: blob.size });
      setPrepareStatus('Package ready');
      setMessage('Package ready. Save the zip when you are ready.');
    } catch (error) {
      const details = error instanceof Error ? error.message : 'Failed to prepare package assets.';
      addErrorLogEntry({
        summary: 'Package preparation failed.',
        details,
        source: 'ImportExportView',
        context: 'prepareExportPackage'
      });
      setMessage('Package preparation failed. Try fewer categories or smaller media files.');
    } finally {
      setIsPreparingPackage(false);
    }
  };

  const savePreparedPackage = () => {
    if (!preparedPackage) {
      setMessage('Prepare the package before saving it.');
      return;
    }
    const url = URL.createObjectURL(preparedPackage.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'chess-unleashed-experience.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setMessage('Package saved.');
  };

  const handleExtractFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    setExtractFile(null);
    setExtractPreview(null);
    setPreparedExtract(null);
    setExtractStatus(null);
    setExtractProgress(null);
    if (!file) return;

    try {
      console.info('[Package Manager] Extract package file selected:', file.name, file.type || 'unknown type', file.size);
      setExtractStatus('Selected file received');
      setExtractProgress({ current: 1, total: 3 });
      setMessage(`Reading extract package: ${file.name}`);
      if (!file.name.toLowerCase().endsWith('.zip')) {
        throw new Error('Extractor supports Chess Unleashed .zip packages only.');
      }
      setExtractStatus('Reading manifest and package metadata');
      setExtractProgress({ current: 2, total: 3 });
      const preview = await readExperiencePackageExtractPreview(file);
      setExtractFile(file);
      setExtractPreview(preview);
      setExtractStatus('Extract preview ready');
      setExtractProgress({ current: 3, total: 3 });
      setMessage('Package ready to extract. Preview contents before preparing the extracted folder.');
      console.info('[Package Manager] Extract preview ready:', preview.name);
    } catch (error) {
      const details = error instanceof Error ? error.message : 'Extractor supports zip packages only.';
      console.error('[Package Manager] Extract preview failed:', error);
      setExtractStatus('Extract preview failed');
      setMessage(details);
    }
  };

  const prepareExtractedPackage = async () => {
    if (!extractFile) {
      setMessage('Choose a package before extracting.');
      return;
    }
    setPreparedExtract(null);
    setIsExtractingPackage(true);
    setExtractStatus('Reading package metadata');
    setExtractProgress(null);
    try {
      console.info('[Package Manager] Preparing extracted package:', extractFile.name);
      const extracted = await createExtractedExperiencePackageZip(extractFile, {
        onProgress: progress => {
          setExtractStatus(progress.message);
          setExtractProgress({ current: progress.current, total: progress.total });
        }
      });
      setPreparedExtract({
        blob: extracted.blob,
        warnings: extracted.warnings,
        packageName: extracted.packageName,
        size: extracted.blob.size
      });
      setExtractStatus('Extracted folder zip ready');
      setMessage('Extracted package ready. Save the extracted zip when you are ready.');
      console.info('[Package Manager] Extracted package ready:', extracted.packageName, extracted.blob.size);
    } catch (error) {
      const details = error instanceof Error ? error.message : 'Failed to extract package.';
      console.error('[Package Manager] Package extraction failed:', error);
      addErrorLogEntry({
        summary: 'Package extraction failed.',
        details,
        source: 'ImportExportView',
        context: 'prepareExtractedPackage'
      });
      setMessage('Package extraction failed. Try a valid Chess Unleashed package zip.');
    } finally {
      setIsExtractingPackage(false);
    }
  };

  const savePreparedExtract = () => {
    if (!preparedExtract) return;
    const url = URL.createObjectURL(preparedExtract.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${preparedExtract.packageName.replace(/\s+/g, '-').toLowerCase()}-extracted.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setMessage('Extracted zip saved.');
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
              Load Package
              <div style={{ marginTop: '4px', fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>Choose a .json or .zip package, validate it, preview contents, then apply it.</div>
            </button>
            <button type="button" onClick={() => setMode('export')} style={{ padding: '12px', borderRadius: 8, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', textAlign: 'left', fontWeight: 700 }}>
              Save Package
              <div style={{ marginTop: '4px', fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>Choose what to include, prepare the zip, then save a shareable package with real media files.</div>
            </button>
            <button type="button" onClick={() => setMode('extract')} style={{ padding: '12px', borderRadius: 8, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', textAlign: 'left', fontWeight: 700 }}>
              Extract Package
              <div style={{ marginTop: '4px', fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>Unpack a package into readable folders for inspection, editing, or manual sharing.</div>
            </button>
          </>
        )}

        {mode === 'import' && (
          <>
            <button type="button" onClick={() => setMode('landing')} style={{ alignSelf: 'flex-start', padding: '6px 10px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer' }}>Back</button>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Load Package</h3>
            <input type="file" accept=".json,.zip,application/json,application/zip" onChange={handleImportFile} />
            {importStatus && (
              <div style={{ padding: '8px 10px', borderRadius: 6, border: pendingImport ? '1px solid #d0d7de' : '1px solid #bfdbfe', background: pendingImport ? '#f8fafc' : '#eff6ff', color: '#334155', fontSize: '0.76rem' }}>
                <strong>{isLoadingPackage ? 'Loading Package' : 'Package Status'}</strong>
                <div>{importStatus}</div>
                {importProgress?.total ? (
                  <div style={{ marginTop: 6, height: 6, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, Math.round(((importProgress.current ?? 0) / importProgress.total) * 100))}%`, background: '#2563eb' }} />
                  </div>
                ) : null}
              </div>
            )}
            {pendingImport && (
              <div style={{ padding: '12px', borderRadius: 8, border: '1px solid #d0d7de', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#2c3e50' }}>Preview Contents</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Name: {pendingImport.name}</div>
                  {pendingImport.version && <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Version: {pendingImport.version}</div>}
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Type: {pendingImport.kind === 'experience' ? 'Experience Package' : 'Theme Package'}</div>
                  {'assetManifest' in (pendingImport.source as ExperiencePackage) && (pendingImport.source as ExperiencePackage).assetManifest?.assets?.length ? (
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Assets: {(pendingImport.source as ExperiencePackage).assetManifest?.assets.length}</div>
                  ) : null}
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
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Save Package</h3>
            <div style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d0d7de', background: '#f8fafc', color: '#475569', fontSize: '0.72rem' }}>
              Experience packages save reusable setup and assets as a shareable .zip. Current board position, turn, move history, timers in progress, and game results are saved only by Game Snapshot resume.
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '6px' }}>Choose categories to include</div>
              {renderCategoryChecklist(
                PACKAGE_CATEGORY_MANIFEST.filter(category => category.exportable && DEFAULT_EXPORT_CATEGORIES.includes(category.id)),
                selectedExportCategories,
                setSelectedExportCategories
              )}
            </div>
            {prepareStatus && (
              <div style={{ padding: '8px 10px', borderRadius: 6, border: preparedPackage ? '1px solid #bbf7d0' : '1px solid #d0d7de', background: preparedPackage ? '#f0fdf4' : '#f8fafc', color: preparedPackage ? '#166534' : '#334155', fontSize: '0.76rem' }}>
                <strong>{preparedPackage ? 'Package Ready' : 'Preparing Package'}</strong>
                <div>{prepareStatus}</div>
                {prepareProgress?.total ? (
                  <div style={{ marginTop: 6, height: 6, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, Math.round(((prepareProgress.current ?? 0) / prepareProgress.total) * 100))}%`, background: '#2c3e50' }} />
                  </div>
                ) : null}
                {preparedPackage && (
                  <div style={{ marginTop: 4 }}>
                    Size: {(preparedPackage.size / (1024 * 1024)).toFixed(2)} MB - Categories: {preparedPackage.categories.map(category => EXPERIENCE_CATEGORY_LABELS[category as PackageCategoryId] ?? category).join(', ')}
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={prepareExportPackage} disabled={selectedExportCategories.length === 0 || isPreparingPackage} style={{ alignSelf: 'flex-start', padding: '8px 12px', borderRadius: 6, border: '1px solid #2c3e50', background: selectedExportCategories.length && !isPreparingPackage ? '#2c3e50' : '#94a3b8', color: '#fff', cursor: selectedExportCategories.length && !isPreparingPackage ? 'pointer' : 'not-allowed', fontWeight: 700 }}>
                {isPreparingPackage ? 'Preparing Package...' : 'Prepare Package'}
              </button>
              <button type="button" onClick={savePreparedPackage} disabled={!preparedPackage || isPreparingPackage} style={{ alignSelf: 'flex-start', padding: '8px 12px', borderRadius: 6, border: '1px solid #16a34a', background: preparedPackage && !isPreparingPackage ? '#f0fdf4' : '#f1f5f9', color: preparedPackage && !isPreparingPackage ? '#166534' : '#94a3b8', cursor: preparedPackage && !isPreparingPackage ? 'pointer' : 'not-allowed', fontWeight: 700 }}>
                Save Package
              </button>
            </div>
          </>
        )}

        {mode === 'extract' && (
          <>
            <button type="button" onClick={() => setMode('landing')} style={{ alignSelf: 'flex-start', padding: '6px 10px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer' }}>Back</button>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Extract Package</h3>
            <div style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d0d7de', background: '#f8fafc', color: '#475569', fontSize: '0.72rem' }}>
              Extracting does not apply package settings. It creates a readable folder layout inside a new zip.
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.78rem', color: '#334155' }}>
              Choose Package
              <input type="file" accept=".zip,application/zip" onChange={handleExtractFile} />
            </label>
            {extractStatus && (
              <div style={{ padding: '8px 10px', borderRadius: 6, border: preparedExtract ? '1px solid #bbf7d0' : '1px solid #d0d7de', background: preparedExtract ? '#f0fdf4' : '#f8fafc', color: preparedExtract ? '#166534' : '#334155', fontSize: '0.76rem' }}>
                <strong>{preparedExtract ? 'Extract Ready' : 'Preparing Extract'}</strong>
                <div>{extractStatus}</div>
                {extractProgress?.total ? (
                  <div style={{ marginTop: 6, height: 6, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, Math.round(((extractProgress.current ?? 0) / extractProgress.total) * 100))}%`, background: '#16a34a' }} />
                  </div>
                ) : null}
              </div>
            )}
            {extractPreview && (
              <div style={{ padding: '12px', borderRadius: 8, border: '1px solid #d0d7de', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontWeight: 700, color: '#2c3e50' }}>Extract Preview</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Name: {extractPreview.name}</div>
                {extractPreview.version && <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Version: {extractPreview.version}</div>}
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Categories: {extractPreview.categories.join(', ') || 'None listed'}</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Assets: {extractPreview.assetCount}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {Object.entries(extractPreview.assetsByCategory).map(([category, count]) => `${category}: ${count}`).join(' | ') || 'No media assets listed'}
                </div>
              </div>
            )}
            {preparedExtract && (
              <div style={{ fontSize: '0.76rem', color: '#166534' }}>
                Size: {(preparedExtract.size / (1024 * 1024)).toFixed(2)} MB
                {preparedExtract.warnings.length ? ` - Warnings: ${preparedExtract.warnings.length}` : ''}
              </div>
            )}
            {preparedExtract?.warnings.length ? (
              <div style={{ padding: 8, borderRadius: 6, border: '1px solid #facc15', background: '#fefce8', color: '#854d0e', fontSize: '0.72rem' }}>
                {preparedExtract.warnings.map(warning => <div key={warning}>{warning}</div>)}
              </div>
            ) : null}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={prepareExtractedPackage} disabled={!extractFile || isExtractingPackage} style={{ alignSelf: 'flex-start', padding: '8px 12px', borderRadius: 6, border: '1px solid #2c3e50', background: extractFile && !isExtractingPackage ? '#2c3e50' : '#94a3b8', color: '#fff', cursor: extractFile && !isExtractingPackage ? 'pointer' : 'not-allowed', fontWeight: 700 }}>
                {isExtractingPackage ? 'Preparing Extracted Folder...' : 'Prepare Extracted Folder'}
              </button>
              <button type="button" onClick={savePreparedExtract} disabled={!preparedExtract || isExtractingPackage} style={{ alignSelf: 'flex-start', padding: '8px 12px', borderRadius: 6, border: '1px solid #16a34a', background: preparedExtract && !isExtractingPackage ? '#f0fdf4' : '#f1f5f9', color: preparedExtract && !isExtractingPackage ? '#166534' : '#94a3b8', cursor: preparedExtract && !isExtractingPackage ? 'pointer' : 'not-allowed', fontWeight: 700 }}>
                Save Extracted Zip
              </button>
            </div>
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
