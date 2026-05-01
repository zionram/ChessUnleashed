import type { AudioProfile, AudioRule, SoundAsset } from '../context/AudioContext';
import type {
  BotSettings,
  SettingsState,
  UIAppearanceSettings,
  ChatSettings,
  BotPersonalityProfile,
  CustomBotConfig,
  CustomEventDefinition,
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
  customRulesets?: CustomRuleset[];
}

export interface ExperiencePackage {
  format: 'chess-unleashed-experience';
  metadata: ExperiencePackageMetadata;
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
  if (contents?.registeredBots && !Array.isArray(contents.registeredBots)) {
    issues.push('Registered bots must be a list.');
  }

  return {
    valid: issues.length === 0,
    issues
  };
};
