import JSZip from 'jszip';
import type { AudioProfile, AudioRule, SoundAsset } from '../context/AudioContext';
import type {
  BotSettings,
  SettingsState,
  UIAppearanceSettings,
  ChatSettings,
  BotPersonalityProfile,
  CustomBotConfig,
  CustomEventDefinition,
  AnimationDefinition,
  AnimationRule,
  LocalPlayerProfile,
  MultiplayerServerConfig
} from '../context/SettingsContext';
import type { ExperienceCompliancePolicy } from './ExperienceCompliancePolicy';
import type { CustomRuleset } from '../rules/RulePackages';
import type { Template } from '../templates';
import type { TimeControlConfig } from '../timer/TimerTypes';
import type { ImportedAssetRegistryEntry } from '../electron-assets';

export interface ExperiencePackageMetadata {
  name: string;
  version: string;
  description?: string;
  author?: string;
}

export interface ExperiencePackageRules {
  gameMode: SettingsState['gameMode'];
  trainingWheels: boolean;
}

export interface ExperiencePackageContents {
  template?: Template;
  uiAppearance?: UIAppearanceSettings;
  timeControl?: TimeControlConfig;
  chatSettings?: ChatSettings;
  rules?: ExperiencePackageRules;
  audio?: AudioProfile;
  audioSettings?: Partial<Pick<AudioProfile, 'masterVolume' | 'musicVolume' | 'sfxVolume' | 'controller' | 'playbackMode'>>;
  soundLibrary?: SoundAsset[];
  soundRules?: AudioRule[];
  audioPlaylists?: Partial<Pick<AudioProfile, 'bgMusic' | 'bgMusicName' | 'playlistName' | 'playlist' | 'currentTrackIndex' | 'playbackMode'>>;
  botSettings?: BotSettings;
  personalityProfiles?: Record<string, BotPersonalityProfile>;
  registeredBots?: CustomBotConfig[];
  localProfile?: LocalPlayerProfile;
  multiplayerServer?: MultiplayerServerConfig;
  compliancePolicy?: ExperienceCompliancePolicy;
  customEvents?: CustomEventDefinition[];
  animationDefinitions?: AnimationDefinition[];
  animationRules?: AnimationRule[];
  customRulesets?: CustomRuleset[];
}

export type ExperienceAssetCategory = 'pieces' | 'boards' | 'audio' | 'ui';

export interface ExperienceAssetManifestEntry {
  id: string;
  filename: string;
  mimeType: string;
  category: ExperienceAssetCategory;
  packagePath: string;
  originalDisplayName: string;
}

export interface ExperienceAssetManifest {
  version: string;
  assets: ExperienceAssetManifestEntry[];
}

export interface ExperiencePackage {
  format: 'chess-unleashed-experience';
  metadata: ExperiencePackageMetadata;
  assetManifest?: ExperienceAssetManifest;
  contents: ExperiencePackageContents;
}

export interface ExperiencePackageValidationResult {
  valid: boolean;
  issues: string[];
}

export interface BuildExperiencePackageOptions {
  metadata?: Partial<ExperiencePackageMetadata>;
  audio?: AudioProfile;
}

export interface ExperiencePackageProgress {
  step: 'gather-settings' | 'collect-media' | 'prepare-zip' | 'ready';
  message: string;
  current?: number;
  total?: number;
}

export interface ExperiencePackageZipOptions {
  onProgress?: (progress: ExperiencePackageProgress) => void;
}

export interface ExperiencePackageExtractPreview {
  name: string;
  version?: string;
  categories: string[];
  assetCount: number;
  assetsByCategory: Record<string, number>;
}

const EXPERIENCE_PACKAGE_VERSION = '1.0.0';
const EXPERIENCE_ASSET_REF_PREFIX = 'package://';

const isPackageAssetRef = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith(EXPERIENCE_ASSET_REF_PREFIX);

const isPackableAssetUrl = (value: unknown): value is string =>
  typeof value === 'string' && (value.startsWith('data:') || value.startsWith('blob:') || value.startsWith('local-asset://'));

const sanitizeFilenamePart = (value: string) =>
  value.trim().replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'asset';

const mimeExtension = (mimeType: string, fallback = 'bin') => {
  const normalized = mimeType.split(';')[0].toLowerCase();
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/midi': 'mid',
    'audio/x-midi': 'mid'
  };
  return map[normalized] ?? fallback;
};

const dataUrlToBlob = (dataUrl: string) => {
  const [header, body] = dataUrl.split(',');
  const mimeType = header.match(/^data:([^;,]+)/)?.[1] || 'application/octet-stream';
  const binary = header.includes(';base64') ? atob(body || '') : decodeURIComponent(body || '');
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
};

const urlToBlob = async (url: string) => {
  if (url.startsWith('data:')) return dataUrlToBlob(url);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not read asset for packaging: ${url}`);
  return response.blob();
};

const makeAssetReference = (packagePath: string) => `${EXPERIENCE_ASSET_REF_PREFIX}${packagePath}`;

const makeDurablePackageId = (pkg: ExperiencePackage) =>
  `${sanitizeFilenamePart(pkg.metadata.name || 'package')}-${Date.now().toString(36)}`;

const getPackageRefPath = (value: unknown) =>
  isPackageAssetRef(value) ? value.replace(EXPERIENCE_ASSET_REF_PREFIX, '') : '';

const getReadablePackageName = (name: string) => sanitizeFilenamePart(name || 'Chess-Unleashed-Package');

const RUNTIME_GAME_STATE_KEYS = new Set([
  'fen',
  'moveHistory',
  'historyFens',
  'currentTurn',
  'timerState',
  'result',
  'gameState',
  'boardState',
  'selectedCustomRulesetId',
  'currentTurnIndex'
]);

const stripRuntimeGameState = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map(item => stripRuntimeGameState(item)) as T;
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !RUNTIME_GAME_STATE_KEYS.has(key))
      .map(([key, item]) => [key, stripRuntimeGameState(item)])
  ) as T;
};

const collectReferencedAssetFolders = (contents: ExperiencePackageContents) => {
  const foldersByPath = new Map<string, string>();
  const mark = (value: unknown, folder: string) => {
    const packagePath = getPackageRefPath(value);
    if (packagePath) foldersByPath.set(packagePath, folder);
  };

  mark(contents.template?.frameLayer?.image, 'frames');
  mark(contents.template?.background?.image, 'backgrounds');
  mark(contents.template?.boardOverlay?.image, 'boards');
  contents.soundLibrary?.forEach(sound => mark(sound.url, 'audio/effects'));
  contents.audio?.library?.forEach(sound => mark(sound.url, 'audio/effects'));
  mark(contents.audio?.bgMusic, 'audio/songs');
  contents.audio?.playlist?.forEach(track => mark(track.url, 'audio/songs'));
  mark(contents.audioPlaylists?.bgMusic, 'audio/songs');
  contents.audioPlaylists?.playlist?.forEach(track => mark(track.url, 'audio/songs'));
  return foldersByPath;
};

const getExtractFolderForAsset = (
  asset: ExperienceAssetManifestEntry,
  foldersByPath: Map<string, string>
) => {
  const explicitFolder = foldersByPath.get(asset.packagePath);
  if (explicitFolder) return explicitFolder;
  if (asset.category === 'pieces') return 'pieces';
  if (asset.category === 'boards') return 'boards';
  if (asset.category === 'audio') return 'audio/effects';
  if (asset.category === 'ui') return 'ui';
  return 'misc';
};

const buildExtractReadme = (pkg: ExperiencePackage, warnings: string[]) => {
  const categories = Object.keys(pkg.contents);
  return `# ${pkg.metadata.name}

Extracted from a Chess Unleashed package.

## Contents

- Package version: ${pkg.metadata.version}
- Categories: ${categories.length ? categories.join(', ') : 'None listed'}
- Assets: ${pkg.assetManifest?.assets.length ?? 0}

## Folders

- pieces/: custom piece images and GIFs
- boards/: board overlay assets
- frames/: board frame assets when detected
- backgrounds/: background images when detected
- audio/songs/: background music and playlist tracks when detected
- audio/effects/: sound effect files
- ui/: profile and interface assets
- events/: custom event definitions
- animations/: animation definitions and event-animation rules
- rules/: custom rulesets/custom games
- bots/: registered bot metadata
- misc/: assets that could not be categorized

## Re-import

To re-import the original package, use Chess Unleashed Package Manager -> Load Package and choose the original .zip.
This extracted folder is intended for inspection, manual editing, and sharing source files. It is not itself the normal import format unless you repackage it later.

${warnings.length ? `## Warnings\n\n${warnings.map(warning => `- ${warning}`).join('\n')}\n` : ''}
`;
};

const walkTemplateAssetUrls = (
  template: Template | undefined,
  visit: (currentUrl: string, category: ExperienceAssetCategory, displayName: string, replace: (nextUrl: string) => void) => void
) => {
  if (!template) return;
  const visitPieceConfig = (config: Template['pieceTheme'] | undefined, label: string) => {
    if (!config) return;
    Object.entries(config.customPieces ?? {}).forEach(([pieceKey, url]) => {
      visit(url, 'pieces', `${label}-${pieceKey}`, nextUrl => {
        config.customPieces[pieceKey] = nextUrl;
      });
    });
    Object.entries(config.customVariants ?? {}).forEach(([pieceKey, rules]) => {
      rules.forEach((rule, index) => {
        visit(rule.image, 'pieces', `${label}-${pieceKey}-variant-${index + 1}`, nextUrl => {
          rule.image = nextUrl;
        });
      });
    });
  };

  visitPieceConfig(template.pieceTheme, 'pieces');
  visitPieceConfig(template.whitePieceTheme, 'white-pieces');
  visitPieceConfig(template.blackPieceTheme, 'black-pieces');
  visit(template.boardOverlay.image, 'boards', 'board-overlay', nextUrl => {
    template.boardOverlay.image = nextUrl;
  });
  visit(template.background.image, 'boards', 'background', nextUrl => {
    template.background.image = nextUrl;
  });
  visit(template.frameLayer.image, 'boards', 'frame-layer', nextUrl => {
    template.frameLayer.image = nextUrl;
  });
  Object.entries(template.audioControllerAppearance.controlImages ?? {}).forEach(([control, url]) => {
    visit(url || '', 'ui', `audio-controller-${control}`, nextUrl => {
      template.audioControllerAppearance.controlImages = {
        ...(template.audioControllerAppearance.controlImages ?? {}),
        [control]: nextUrl
      };
    });
  });
};

const walkAudioAssetUrls = (
  contents: ExperiencePackageContents,
  visit: (currentUrl: string, category: ExperienceAssetCategory, displayName: string, replace: (nextUrl: string) => void) => void
) => {
  const visitSound = (sound: SoundAsset) => {
    visit(sound.url, 'audio', sound.name, nextUrl => {
      sound.url = nextUrl;
    });
  };
  contents.audio?.library?.forEach(visitSound);
  contents.soundLibrary?.forEach(visitSound);
  if (contents.audio?.bgMusic) {
    visit(contents.audio.bgMusic, 'audio', contents.audio.bgMusicName || 'background-music', nextUrl => {
      if (contents.audio) contents.audio.bgMusic = nextUrl;
    });
  }
  contents.audio?.playlist?.forEach(track => {
    visit(track.url, 'audio', track.name, nextUrl => {
      track.url = nextUrl;
    });
  });
  if (contents.audioPlaylists?.bgMusic) {
    visit(contents.audioPlaylists.bgMusic, 'audio', contents.audioPlaylists.bgMusicName || 'background-music', nextUrl => {
      if (contents.audioPlaylists) contents.audioPlaylists.bgMusic = nextUrl;
    });
  }
  contents.audioPlaylists?.playlist?.forEach(track => {
    visit(track.url, 'audio', track.name, nextUrl => {
      track.url = nextUrl;
    });
  });
};

const walkProfileAssetUrls = (
  contents: ExperiencePackageContents,
  visit: (currentUrl: string, category: ExperienceAssetCategory, displayName: string, replace: (nextUrl: string) => void) => void
) => {
  if (!contents.localProfile?.profileImage) return;
  visit(contents.localProfile.profileImage, 'ui', 'profile-image', nextUrl => {
    if (contents.localProfile) contents.localProfile.profileImage = nextUrl;
  });
};

export const prepareExperiencePackageAssets = async (pkg: ExperiencePackage, options: ExperiencePackageZipOptions = {}) => {
  const packaged = JSON.parse(JSON.stringify(pkg)) as ExperiencePackage;
  const assetManifest: ExperienceAssetManifest = { version: '1.0.0', assets: [] };
  const assetFiles: Array<{ path: string; blob: Blob }> = [];
  const refByUrl = new Map<string, string>();

  const packageAsset = async (url: string, category: ExperienceAssetCategory, displayName: string) => {
    if (!isPackableAssetUrl(url)) return url;
    const existingRef = refByUrl.get(url);
    if (existingRef) return existingRef;

    const blob = await urlToBlob(url);
    const extension = mimeExtension(blob.type, displayName.split('.').pop() || 'bin');
    const id = `asset-${assetManifest.assets.length + 1}`;
    const filename = `${sanitizeFilenamePart(displayName)}-${id}.${extension}`;
    const packagePath = `assets/${category}/${filename}`;
    const ref = makeAssetReference(packagePath);

    assetManifest.assets.push({
      id,
      filename,
      mimeType: blob.type || 'application/octet-stream',
      category,
      packagePath,
      originalDisplayName: displayName
    });
    assetFiles.push({ path: packagePath, blob });
    refByUrl.set(url, ref);
    return ref;
  };

  const replacements: Array<() => Promise<void>> = [];
  const visit = (url: string, category: ExperienceAssetCategory, displayName: string, replace: (nextUrl: string) => void) => {
    if (!isPackableAssetUrl(url)) return;
    replacements.push(async () => {
      replace(await packageAsset(url, category, displayName));
    });
  };

  options.onProgress?.({ step: 'gather-settings', message: 'Gathering selected settings' });
  walkTemplateAssetUrls(packaged.contents.template, visit);
  walkAudioAssetUrls(packaged.contents, visit);
  walkProfileAssetUrls(packaged.contents, visit);
  for (const [index, replacement] of replacements.entries()) {
    options.onProgress?.({
      step: 'collect-media',
      message: `Collecting media files (${index + 1}/${replacements.length})`,
      current: index + 1,
      total: replacements.length
    });
    await replacement();
    await new Promise(resolve => window.setTimeout(resolve, 0));
  }

  if (assetManifest.assets.length > 0) packaged.assetManifest = assetManifest;
  return { packaged, assetManifest, assetFiles };
};

export const createExperiencePackageZip = async (pkg: ExperiencePackage, options: ExperiencePackageZipOptions = {}) => {
  const { packaged, assetManifest, assetFiles } = await prepareExperiencePackageAssets(pkg, options);
  const zip = new JSZip();
  options.onProgress?.({ step: 'prepare-zip', message: 'Preparing zip manifest' });
  zip.file('manifest.json', JSON.stringify({
    format: packaged.format,
    metadata: packaged.metadata,
    assetManifest,
    categories: Object.keys(packaged.contents)
  }, null, 2));
  zip.file('experience.json', JSON.stringify(packaged, null, 2));
  assetFiles.forEach((asset, index) => {
    options.onProgress?.({
      step: 'prepare-zip',
      message: `Adding media files to zip (${index + 1}/${assetFiles.length})`,
      current: index + 1,
      total: assetFiles.length
    });
    zip.file(asset.path, asset.blob);
  });
  const blob = await zip.generateAsync({ type: 'blob' }, metadata => {
    options.onProgress?.({
      step: 'prepare-zip',
      message: `Compressing package (${Math.round(metadata.percent)}%)`,
      current: Math.round(metadata.percent),
      total: 100
    });
  });
  options.onProgress?.({ step: 'ready', message: 'Package ready' });
  return blob;
};

export const loadExperiencePackageAssetsFromZip = async (pkg: ExperiencePackage, zip: JSZip) => {
  if (!pkg.assetManifest?.assets.length) return { package: pkg, warnings: [] as string[] };

  const hydrated = JSON.parse(JSON.stringify(pkg)) as ExperiencePackage;
  const warnings: string[] = [];
  const urlByRef = new Map<string, string>();

  await Promise.all(pkg.assetManifest.assets.map(async asset => {
    const file = zip.file(asset.packagePath);
    if (!file) {
      warnings.push(`Missing package asset: ${asset.packagePath}`);
      return;
    }
    const blob = await file.async('blob');
    urlByRef.set(makeAssetReference(asset.packagePath), URL.createObjectURL(blob));
  }));

  const replaceRef = (url: string, _category: ExperienceAssetCategory, _displayName: string, replace: (nextUrl: string) => void) => {
    if (!isPackageAssetRef(url)) return;
    const objectUrl = urlByRef.get(url);
    if (objectUrl) replace(objectUrl);
    else warnings.push(`Package asset reference could not be restored: ${url.replace(EXPERIENCE_ASSET_REF_PREFIX, '')}`);
  };

  walkTemplateAssetUrls(hydrated.contents.template, replaceRef);
  walkAudioAssetUrls(hydrated.contents, replaceRef);
  walkProfileAssetUrls(hydrated.contents, replaceRef);
  return { package: hydrated, warnings };
};

export const persistExperiencePackageAssetsFromZip = async (pkg: ExperiencePackage, zip: JSZip) => {
  if (!pkg.assetManifest?.assets.length) {
    return { package: pkg, warnings: [] as string[], importedAssets: [] as ImportedAssetRegistryEntry[], durable: false };
  }

  if (!window.chessUnleashedAssets?.savePackageAssets) {
    const hydrated = await loadExperiencePackageAssetsFromZip(pkg, zip);
    return {
      ...hydrated,
      importedAssets: [] as ImportedAssetRegistryEntry[],
      durable: false,
      warnings: [
        ...hydrated.warnings,
        'Durable imported asset storage is unavailable in this environment; media uses session-only object URLs.'
      ]
    };
  }

  const warnings: string[] = [];
  const assets = (await Promise.all(pkg.assetManifest.assets.map(async asset => {
    const file = zip.file(asset.packagePath);
    if (!file) {
      warnings.push(`Missing package asset: ${asset.packagePath}`);
      return null;
    }
    return {
      id: asset.id,
      packagePath: asset.packagePath,
      bytes: await file.async('arraybuffer'),
      mimeType: asset.mimeType,
      category: asset.category,
      displayName: asset.originalDisplayName || asset.filename
    };
  }))).filter(Boolean) as Array<{
    id: string;
    packagePath: string;
    bytes: ArrayBuffer;
    mimeType: string;
    category: ExperienceAssetCategory;
    displayName: string;
  }>;

  const saved = await window.chessUnleashedAssets.savePackageAssets({
    packageId: makeDurablePackageId(pkg),
    assets
  });
  const durable = JSON.parse(JSON.stringify(pkg)) as ExperiencePackage;

  const replaceRef = (url: string, _category: ExperienceAssetCategory, _displayName: string, replace: (nextUrl: string) => void) => {
    if (!isPackageAssetRef(url)) return;
    const localRef = saved.refs[url];
    if (localRef) replace(localRef);
    else warnings.push(`Package asset reference could not be persisted: ${url.replace(EXPERIENCE_ASSET_REF_PREFIX, '')}`);
  };

  walkTemplateAssetUrls(durable.contents.template, replaceRef);
  walkAudioAssetUrls(durable.contents, replaceRef);
  walkProfileAssetUrls(durable.contents, replaceRef);
  return { package: durable, warnings, importedAssets: saved.assets, durable: true };
};

export const readExperiencePackageZip = async (file: File, options: { loadAssets?: boolean } = {}) => {
  const zip = await JSZip.loadAsync(file);
  const experienceContent = await zip.file('experience.json')?.async('string');
  if (!experienceContent) throw new Error('No supported package file found in zip.');
  const pkg = JSON.parse(experienceContent) as ExperiencePackage;
  if (!options.loadAssets) return { package: pkg, warnings: [] as string[], importedAssets: [] as ImportedAssetRegistryEntry[], durable: false, zip };
  const hydrated = await persistExperiencePackageAssetsFromZip(pkg, zip);
  return { ...hydrated, zip };
};

export const readExperiencePackageExtractPreview = async (file: File): Promise<ExperiencePackageExtractPreview> => {
  if (!file.name.toLowerCase().endsWith('.zip')) throw new Error('Extractor supports Chess Unleashed .zip packages.');
  const zip = await JSZip.loadAsync(file);
  const manifestContent = await zip.file('manifest.json')?.async('string');
  const experienceContent = await zip.file('experience.json')?.async('string');
  if (!experienceContent) throw new Error('No supported package file found in zip.');
  const pkg = JSON.parse(experienceContent) as ExperiencePackage;
  const manifest = manifestContent ? JSON.parse(manifestContent) as Partial<ExperiencePackage> & { categories?: string[] } : null;
  const assets = pkg.assetManifest?.assets ?? [];
  const assetsByCategory = assets.reduce((counts, asset) => ({
    ...counts,
    [asset.category]: (counts[asset.category] ?? 0) + 1
  }), {} as Record<string, number>);

  return {
    name: pkg.metadata.name,
    version: pkg.metadata.version,
    categories: manifest?.categories ?? Object.keys(pkg.contents),
    assetCount: assets.length,
    assetsByCategory
  };
};

export const createExtractedExperiencePackageZip = async (file: File, options: ExperiencePackageZipOptions = {}) => {
  if (!file.name.toLowerCase().endsWith('.zip')) throw new Error('Extractor supports Chess Unleashed .zip packages.');
  options.onProgress?.({ step: 'gather-settings', message: 'Reading package metadata' });
  const sourceZip = await JSZip.loadAsync(file);
  const experienceContent = await sourceZip.file('experience.json')?.async('string');
  const manifestContent = await sourceZip.file('manifest.json')?.async('string');
  if (!experienceContent) throw new Error('No supported package file found in zip.');

  const pkg = JSON.parse(experienceContent) as ExperiencePackage;
  const outputZip = new JSZip();
  const rootName = `Themes/${getReadablePackageName(pkg.metadata.name)}`;
  const warnings: string[] = [];
  const foldersByPath = collectReferencedAssetFolders(pkg.contents);

  outputZip.file(`${rootName}/manifest.json`, manifestContent || JSON.stringify({
    format: pkg.format,
    metadata: pkg.metadata,
    assetManifest: pkg.assetManifest,
    categories: Object.keys(pkg.contents)
  }, null, 2));
  outputZip.file(`${rootName}/experience.json`, JSON.stringify(pkg, null, 2));
  if (pkg.contents.customEvents) outputZip.file(`${rootName}/events/custom-events.json`, JSON.stringify(pkg.contents.customEvents, null, 2));
  if (pkg.contents.animationDefinitions) outputZip.file(`${rootName}/animations/animation-definitions.json`, JSON.stringify(pkg.contents.animationDefinitions, null, 2));
  if (pkg.contents.animationRules) outputZip.file(`${rootName}/animations/event-animation-rules.json`, JSON.stringify(pkg.contents.animationRules, null, 2));
  if (pkg.contents.customRulesets) outputZip.file(`${rootName}/rules/custom-rulesets.json`, JSON.stringify(pkg.contents.customRulesets, null, 2));
  if (pkg.contents.registeredBots) outputZip.file(`${rootName}/bots/registered-bots.json`, JSON.stringify(pkg.contents.registeredBots, null, 2));

  const assets = pkg.assetManifest?.assets ?? [];
  for (const [index, asset] of assets.entries()) {
    options.onProgress?.({
      step: 'collect-media',
      message: `Extracting media files (${index + 1}/${assets.length})`,
      current: index + 1,
      total: assets.length
    });
    const sourceFile = sourceZip.file(asset.packagePath);
    if (!sourceFile) {
      warnings.push(`Missing package asset: ${asset.packagePath}`);
      continue;
    }
    const folder = getExtractFolderForAsset(asset, foldersByPath);
    const displayFilename = asset.originalDisplayName.includes('.') ? asset.originalDisplayName : asset.filename;
    const filename = sanitizeFilenamePart(displayFilename || asset.filename);
    outputZip.file(`${rootName}/${folder}/${asset.id}-${filename || asset.filename}`, await sourceFile.async('blob'));
    await new Promise(resolve => window.setTimeout(resolve, 0));
  }

  outputZip.file(`${rootName}/README_PACKAGE_CONTENTS.md`, buildExtractReadme(pkg, warnings));
  options.onProgress?.({ step: 'prepare-zip', message: 'Preparing extracted zip' });
  const blob = await outputZip.generateAsync({ type: 'blob' }, metadata => {
    options.onProgress?.({
      step: 'prepare-zip',
      message: `Compressing extracted package (${Math.round(metadata.percent)}%)`,
      current: Math.round(metadata.percent),
      total: 100
    });
  });
  options.onProgress?.({ step: 'ready', message: 'Extracted package ready' });
  return { blob, warnings, rootName, packageName: pkg.metadata.name };
};

export const buildExperiencePackage = (
  settings: SettingsState,
  options: BuildExperiencePackageOptions = {}
): ExperiencePackage => {
  const contents: ExperiencePackageContents = {
    template: settings.template,
    uiAppearance: settings.uiAppearance,
    timeControl: settings.timeControl,
    chatSettings: settings.chatSettings,
    rules: {
      gameMode: settings.gameMode,
      trainingWheels: settings.trainingWheels
    },
    ...(options.audio ? {
      audio: options.audio,
      audioSettings: {
        masterVolume: options.audio.masterVolume,
        musicVolume: options.audio.musicVolume,
        sfxVolume: options.audio.sfxVolume,
        controller: options.audio.controller,
        playbackMode: options.audio.playbackMode
      },
      soundLibrary: options.audio.library,
      soundRules: options.audio.rules,
      audioPlaylists: {
        bgMusic: options.audio.bgMusic,
        bgMusicName: options.audio.bgMusicName,
        playlistName: options.audio.playlistName,
        playlist: options.audio.playlist,
        currentTrackIndex: options.audio.currentTrackIndex,
        playbackMode: options.audio.playbackMode
      }
    } : {}),
    botSettings: settings.botSettings,
    registeredBots: settings.registeredBots,
    personalityProfiles: settings.personalityProfiles,
    localProfile: settings.localProfile,
    multiplayerServer: settings.multiplayerServer,
    customEvents: settings.customEvents,
    animationDefinitions: settings.animationDefinitions.filter(animation => !animation.builtin),
    animationRules: settings.animationRules,
    customRulesets: settings.customRulesets.filter(ruleset => ruleset.status === 'approved')
  };

  return {
    format: 'chess-unleashed-experience',
    metadata: {
      name: options.metadata?.name ?? 'Chess Unleashed Experience',
      version: options.metadata?.version ?? EXPERIENCE_PACKAGE_VERSION,
      description: options.metadata?.description,
      author: options.metadata?.author
    },
    contents: stripRuntimeGameState(contents)
  };
};

export const validateExperiencePackage = (pkg: unknown): ExperiencePackageValidationResult => {
  const issues: string[] = [];
  const candidate = pkg as Partial<ExperiencePackage> | null;

  if (!candidate || candidate.format !== 'chess-unleashed-experience') {
    issues.push('Invalid package format.');
  }

  if (!candidate?.metadata?.version || typeof candidate.metadata.version !== 'string') {
    issues.push('Missing package version.');
  }

  if (!candidate?.metadata?.name || typeof candidate.metadata.name !== 'string' || !candidate.metadata.name.trim()) {
    issues.push('Missing package name.');
  }

  if (!candidate?.contents || typeof candidate.contents !== 'object') {
    issues.push('Missing package contents.');
  }

  const contents = candidate?.contents as Partial<ExperiencePackageContents> | undefined;
  if (contents?.soundRules && !Array.isArray(contents.soundRules)) {
    issues.push('Sound rules must be a list.');
  }
  if (contents?.soundLibrary && !Array.isArray(contents.soundLibrary)) {
    issues.push('Sound library must be a list.');
  }
  if (contents?.customEvents && !Array.isArray(contents.customEvents)) {
    issues.push('Custom events must be a list.');
  }
  if (contents?.customRulesets && !Array.isArray(contents.customRulesets)) {
    issues.push('Custom rulesets must be a list.');
  }
  if (contents?.animationDefinitions && !Array.isArray(contents.animationDefinitions)) {
    issues.push('Animation definitions must be a list.');
  }
  if (contents?.animationRules && !Array.isArray(contents.animationRules)) {
    issues.push('Animation rules must be a list.');
  }
  if (contents?.registeredBots && !Array.isArray(contents.registeredBots)) {
    issues.push('Registered bots must be a list.');
  }

  return {
    valid: issues.length === 0,
    issues
  };
};
