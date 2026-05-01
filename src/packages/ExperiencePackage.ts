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

const EXPERIENCE_PACKAGE_VERSION = '1.0.0';
const EXPERIENCE_ASSET_REF_PREFIX = 'package://';

const isPackageAssetRef = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith(EXPERIENCE_ASSET_REF_PREFIX);

const isPackableAssetUrl = (value: unknown): value is string =>
  typeof value === 'string' && (value.startsWith('data:') || value.startsWith('blob:'));

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

export const prepareExperiencePackageAssets = async (pkg: ExperiencePackage) => {
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

  const replacements: Array<Promise<void>> = [];
  const visit = (url: string, category: ExperienceAssetCategory, displayName: string, replace: (nextUrl: string) => void) => {
    if (!isPackableAssetUrl(url)) return;
    replacements.push(packageAsset(url, category, displayName).then(replace));
  };

  walkTemplateAssetUrls(packaged.contents.template, visit);
  walkAudioAssetUrls(packaged.contents, visit);
  walkProfileAssetUrls(packaged.contents, visit);
  await Promise.all(replacements);

  if (assetManifest.assets.length > 0) packaged.assetManifest = assetManifest;
  return { packaged, assetManifest, assetFiles };
};

export const createExperiencePackageZip = async (pkg: ExperiencePackage) => {
  const { packaged, assetManifest, assetFiles } = await prepareExperiencePackageAssets(pkg);
  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify({
    format: packaged.format,
    metadata: packaged.metadata,
    assetManifest,
    categories: Object.keys(packaged.contents)
  }, null, 2));
  zip.file('experience.json', JSON.stringify(packaged, null, 2));
  assetFiles.forEach(asset => zip.file(asset.path, asset.blob));
  return zip.generateAsync({ type: 'blob' });
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

export const readExperiencePackageZip = async (file: File, options: { loadAssets?: boolean } = {}) => {
  const zip = await JSZip.loadAsync(file);
  const experienceContent = await zip.file('experience.json')?.async('string');
  if (!experienceContent) throw new Error('No supported package file found in zip.');
  const pkg = JSON.parse(experienceContent) as ExperiencePackage;
  if (!options.loadAssets) return { package: pkg, warnings: [] as string[], zip };
  const hydrated = await loadExperiencePackageAssetsFromZip(pkg, zip);
  return { ...hydrated, zip };
};

export const buildExperiencePackage = (
  settings: SettingsState,
  options: BuildExperiencePackageOptions = {}
): ExperiencePackage => ({
  format: 'chess-unleashed-experience',
  metadata: {
    name: options.metadata?.name ?? 'Chess Unleashed Experience',
    version: options.metadata?.version ?? EXPERIENCE_PACKAGE_VERSION,
    description: options.metadata?.description,
    author: options.metadata?.author
  },
  contents: {
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
  }
});

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
