import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { defaultTemplate, type Template } from '../templates';
import type { TimeControlConfig } from '../timer/TimerTypes';
import type { CustomRuleset } from '../rules/RulePackages';
import { eventBus } from '../events/EventBus';
import type { ImportedAssetRegistryEntry } from '../electron-assets';

export type BotDifficulty = 'Easy' | 'Casual' | 'Intermediate' | 'Advanced' | 'Expert' | 'Master' | 'Grandmaster';
export type BotPersonality = string;
export type BotChatTrigger = 'gameStart' | 'botCapture' | 'botCaptured' | 'check' | 'checkmate' | 'draw';
export type EngineId = string;

export type ServerMode = 'home' | 'custom' | 'official';

export interface MultiplayerServerConfig {
  mode: ServerMode;
  customUrl: string;
  homeUrl: string;
}

export interface CustomBotConfig {
  id: string;
  name: string;
  type: 'worker' | 'web' | 'mock';
  path: string;
  builtin?: boolean;
}

export const BUNDLED_STOCKFISH_BOT: CustomBotConfig = {
  id: 'stockfish-18-lite-bundled',
  name: 'Stockfish 18 Lite',
  type: 'worker',
  path: 'engines/stockfish/stockfish-18-lite-single.js',
  builtin: true
};

export const DEFAULT_REGISTERED_BOTS: CustomBotConfig[] = [
  { id: 'standard', name: 'Training Bot (Standard)', type: 'mock', path: 'internal', builtin: true },
  { id: 'random', name: 'Random Bot', type: 'mock', path: 'internal', builtin: true },
  BUNDLED_STOCKFISH_BOT
];

export interface LocalPlayerProfile {
  displayName: string;
  profileImage: string;
  guestId: string;
  profileType: 'guest' | 'official';
  isGuest: boolean;
  officialId: string | null;
}

export type CustomEventBaseTrigger =
  | 'afterMove'
  | 'pieceMoved'
  | 'pieceCaptured'
  | 'check'
  | 'checkmate'
  | 'promotion'
  | 'gameStart'
  | 'gameEnd'
  | 'panelOpened';

export type CustomEventComplexCondition = 'pieceAttacked' | 'fork' | 'pin' | 'trappedPiece' | 'noSafeMove';

export interface CustomEventDefinition {
  id: string;
  name: string;
  eventId: string;
  category: string;
  baseTrigger: CustomEventBaseTrigger | '';
  conditionMode?: 'all' | 'any';
  conditions: {
    pieceType?: string;
    team?: string;
    fromSquare?: string;
    toSquare?: string;
    capturedPiece?: string;
    panelViewId?: string;
    complexCondition?: CustomEventComplexCondition | '';
  };
}

export interface BotPersonalityTraits {
  aggression: number;
  caution: number;
  randomness: number;
  trickiness: number;
  consistency: number;
}

export interface BotSettings {
  personality: BotPersonality;
  personalityTraits: BotPersonalityTraits;
  difficulty: BotDifficulty;
  depth: number;
  randomness: number;
  capturePriority: number;
  checkPriority: number;
  avoidRepetition: boolean;
  thinkTime: number;
  showMoveExplanation: boolean;
  botChatEnabled: boolean;
}

export interface BotPersonalityProfile {
  name: string;
  description: string;
  settings: Omit<BotSettings, 'personality'>;
  chatReactions: Record<BotChatTrigger, string[]>;
  builtin?: boolean;
}

export const BOT_PERSONALITY_DESCRIPTIONS: Record<string, string> = {
  Beginner: 'Loose, unpredictable play with simple tactical priorities.',
  Aggressive: 'Forces captures and checks whenever pressure is available.',
  Defensive: 'Careful play that avoids uneven trades and repeated mistakes.',
  Trickster: 'Surprising, irregular choices with extra randomness.',
  Balanced: 'Stable all-around play with moderate tactical bias.'
};

export const BOT_CHAT_REACTIONS: Record<string, Record<BotChatTrigger, string[]>> = {
  Beginner: {
    gameStart: ['Good luck!', 'I am still learning.'],
    botCapture: ['I got one!', 'That worked!'],
    botCaptured: ['Oops.', 'I missed that.'],
    check: ['Check!', 'Is that check?'],
    checkmate: ['Did I win?', 'Checkmate!'],
    draw: ['Fair game.', 'A draw works.']
  },
  Aggressive: {
    gameStart: ['No quiet game today.', 'I am coming forward.'],
    botCapture: ['Mine.', 'Pressure pays.'],
    botCaptured: ['I will get it back.', 'Temporary loss.'],
    check: ['Check.', 'Your king is exposed.'],
    checkmate: ['Finished.', 'No escape.'],
    draw: ['You survived.', 'I wanted more.']
  },
  Defensive: {
    gameStart: ['Careful moves win games.', 'I will keep this solid.'],
    botCapture: ['Clean trade.', 'That was safe.'],
    botCaptured: ['I will stabilize.', 'Not ideal.'],
    check: ['Check, with control.', 'Your king has a problem.'],
    checkmate: ['Technique decides it.', 'Checkmate.'],
    draw: ['Balanced result.', 'Solid defense.']
  },
  Trickster: {
    gameStart: ['Expect weird moves.', 'Let us make this messy.'],
    botCapture: ['Surprise.', 'Did you see that?'],
    botCaptured: ['Part of the plan.', 'Maybe bait.'],
    check: ['Tricky check.', 'Look over there.'],
    checkmate: ['The trap closes.', 'Gotcha.'],
    draw: ['Strange, but fair.', 'Nobody saw that coming.']
  },
  Balanced: {
    gameStart: ['Good game.', 'Let us play.'],
    botCapture: ['Good capture.', 'I will take that.'],
    botCaptured: ['Nice move.', 'I need to adjust.'],
    check: ['Check.', 'Careful now.'],
    checkmate: ['Checkmate.', 'Good finish.'],
    draw: ['Draw agreed.', 'Even game.']
  }
};

export const BOT_PERSONALITY_PRESETS: Record<string, Omit<BotSettings, 'personality'>> = {
  Beginner: {
    personalityTraits: {
      aggression: 0.3,
      caution: 0.2,
      randomness: 0.8,
      trickiness: 0.2,
      consistency: 0.2
    },
    difficulty: 'Easy',
    depth: 1,
    randomness: 0.7,
    capturePriority: 0.7,
    checkPriority: 0.5,
    avoidRepetition: false,
    thinkTime: 400,
    showMoveExplanation: true,
    botChatEnabled: true
  },
  Aggressive: {
    personalityTraits: {
      aggression: 1,
      caution: 0.2,
      randomness: 0.2,
      trickiness: 0.3,
      consistency: 0.7
    },
    difficulty: 'Advanced',
    depth: 2,
    randomness: 0.2,
    capturePriority: 2.5,
    checkPriority: 2.5,
    avoidRepetition: true,
    thinkTime: 600,
    showMoveExplanation: true,
    botChatEnabled: true
  },
  Defensive: {
    personalityTraits: {
      aggression: 0.2,
      caution: 1,
      randomness: 0.1,
      trickiness: 0.1,
      consistency: 0.9
    },
    difficulty: 'Expert',
    depth: 3,
    randomness: 0.1,
    capturePriority: 0.6,
    checkPriority: 1.2,
    avoidRepetition: true,
    thinkTime: 900,
    showMoveExplanation: true,
    botChatEnabled: true
  },
  Trickster: {
    personalityTraits: {
      aggression: 0.5,
      caution: 0.1,
      randomness: 1,
      trickiness: 1,
      consistency: 0.1
    },
    difficulty: 'Casual',
    depth: 1,
    randomness: 0.9,
    capturePriority: 1.1,
    checkPriority: 1.8,
    avoidRepetition: false,
    thinkTime: 500,
    showMoveExplanation: true,
    botChatEnabled: true
  },
  Balanced: {
    personalityTraits: {
      aggression: 0.5,
      caution: 0.5,
      randomness: 0.4,
      trickiness: 0.3,
      consistency: 0.7
    },
    difficulty: 'Intermediate',
    depth: 1,
    randomness: 0.3,
    capturePriority: 1,
    checkPriority: 1,
    avoidRepetition: true,
    thinkTime: 600,
    showMoveExplanation: true,
    botChatEnabled: true
  }
};

export const DEFAULT_BOT_PERSONALITY_PROFILES: Record<string, BotPersonalityProfile> = Object.keys(BOT_PERSONALITY_PRESETS).reduce((profiles, name) => ({
  ...profiles,
  [name]: {
    name,
    description: BOT_PERSONALITY_DESCRIPTIONS[name],
    settings: BOT_PERSONALITY_PRESETS[name],
    chatReactions: BOT_CHAT_REACTIONS[name],
    builtin: true
  }
}), {} as Record<string, BotPersonalityProfile>);

export interface ChatSettings {
  position: 'right' | 'bottom' | 'floating';
  lineCount: number;
  floatingPos?: { x: number; y: number };
  style: {
    fontFamily: string;
    fontSize: number;
    messageSpacing: number;
  };
}

export interface UIAppearanceSettings {
  fontFamily: string;
  baseFontSize: number;
  accentColor: string;
  density: 'compact' | 'comfortable' | 'spacious';
  showTipsBoard: boolean;
  tipsRotationSeconds: number;
  tipsMessages: string[];
  welcomePanelColor: string;
  welcomePanelFrameColor: string;
  welcomePanelFrameMode: 'accent' | 'custom' | 'none';
  welcomeSidebarContainerColor: string;
  welcomeSidebarContainerFrameColor: string;
  welcomeSidebarContainerFrameMode: 'accent' | 'custom' | 'none';
  panelOpacity: number;
  panelBackdropBlur: number;
  overlayBackdropOpacity: number;
  overlayContentBlur: number;
  buttonStyle: 'rounded' | 'square' | 'minimal';
  sidebarStyle: 'flat' | 'glass' | 'bordered';
  panelBackgroundColor: string;
  appBackgroundColor: string;
  toolbarBackgroundColor: string;
}


export interface MoveAssistSettings {
  hoverPieceIdentity: boolean;
  hoverPieceIdentityOnlineOnly: boolean;
  hoverPieceGlow: boolean;
}

export interface PieceAnimationSettings {
  enabled: boolean;
  movementSpeedMs: number;
  easing: 'linear' | 'ease' | 'ease-in-out';
  captureAnimation: boolean;
  promotionAnimation: boolean;
  defaultAnimationId?: string;
  movementScope: 'all' | 'my-pieces' | 'opponent-pieces' | 'white-pieces' | 'black-pieces';
}

export type AnimationPresetType =
  | 'snap'
  | 'slide'
  | 'fast-slide'
  | 'bounce'
  | 'hop'
  | 'shake'
  | 'pulse'
  | 'capture-pop'
  | 'promotion-glow'
  | 'board-flash';

export type AnimationTargetType = 'piece' | 'captured-piece' | 'promoted-piece' | 'board' | 'ui';

export interface AnimationDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  preset: AnimationPresetType;
  targetType: AnimationTargetType;
  durationMs: number;
  delayMs: number;
  easing: PieceAnimationSettings['easing'];
  intensity: number;
  repeatCount: number;
  enabled: boolean;
  status: 'built-in' | 'draft' | 'active' | 'disabled';
  builtin?: boolean;
}

export type AnimationEventTarget = 'moved-piece' | 'captured-piece' | 'target-square' | 'source-square' | 'board' | 'current-player-panel' | 'fallback-preview';
export type AnimationRuleScope = 'any-piece' | 'my-pieces' | 'opponent-pieces' | 'white-pieces' | 'black-pieces';

export interface AnimationRule {
  id: string;
  eventId: string;
  animationId: string;
  target: AnimationEventTarget;
  scope?: AnimationRuleScope;
  enabled: boolean;
}

export const DEFAULT_ANIMATION_DEFINITIONS: AnimationDefinition[] = [
  { id: 'anim-snap', name: 'Snap / No Animation', description: 'Instant movement with no slide.', category: 'Movement', preset: 'snap', targetType: 'piece', durationMs: 0, delayMs: 0, easing: 'linear', intensity: 0, repeatCount: 1, enabled: true, status: 'built-in', builtin: true },
  { id: 'anim-slide', name: 'Slide', description: 'Standard smooth piece slide.', category: 'Movement', preset: 'slide', targetType: 'piece', durationMs: 220, delayMs: 0, easing: 'ease-in-out', intensity: 0.5, repeatCount: 1, enabled: true, status: 'built-in', builtin: true },
  { id: 'anim-fast-slide', name: 'Fast Slide', description: 'Quick direct movement.', category: 'Movement', preset: 'fast-slide', targetType: 'piece', durationMs: 120, delayMs: 0, easing: 'ease', intensity: 0.4, repeatCount: 1, enabled: true, status: 'built-in', builtin: true },
  { id: 'anim-bounce', name: 'Bounce', description: 'Movement with a playful bounce preview.', category: 'Movement', preset: 'bounce', targetType: 'piece', durationMs: 340, delayMs: 0, easing: 'ease-in-out', intensity: 0.7, repeatCount: 1, enabled: true, status: 'built-in', builtin: true },
  { id: 'anim-hop', name: 'Hop', description: 'Piece hops between squares.', category: 'Movement', preset: 'hop', targetType: 'piece', durationMs: 280, delayMs: 0, easing: 'ease-in-out', intensity: 0.7, repeatCount: 1, enabled: true, status: 'built-in', builtin: true },
  { id: 'anim-shake', name: 'Shake', description: 'Short shake for warnings or blocked actions.', category: 'Feedback', preset: 'shake', targetType: 'piece', durationMs: 260, delayMs: 0, easing: 'linear', intensity: 0.6, repeatCount: 1, enabled: true, status: 'built-in', builtin: true },
  { id: 'anim-pulse', name: 'Pulse', description: 'Soft pulse for highlights.', category: 'Feedback', preset: 'pulse', targetType: 'piece', durationMs: 320, delayMs: 0, easing: 'ease-in-out', intensity: 0.5, repeatCount: 1, enabled: true, status: 'built-in', builtin: true },
  { id: 'anim-capture-pop', name: 'Capture Pop', description: 'Small pop for captures.', category: 'Capture', preset: 'capture-pop', targetType: 'captured-piece', durationMs: 180, delayMs: 0, easing: 'ease', intensity: 0.8, repeatCount: 1, enabled: true, status: 'built-in', builtin: true },
  { id: 'anim-promotion-glow', name: 'Promotion Glow', description: 'Glow effect for promoted pieces.', category: 'Promotion', preset: 'promotion-glow', targetType: 'promoted-piece', durationMs: 500, delayMs: 0, easing: 'ease-in-out', intensity: 0.6, repeatCount: 1, enabled: true, status: 'built-in', builtin: true },
  { id: 'anim-board-flash', name: 'Board Flash', description: 'Board-wide flash for future event triggers.', category: 'Board', preset: 'board-flash', targetType: 'board', durationMs: 300, delayMs: 0, easing: 'ease', intensity: 0.4, repeatCount: 1, enabled: true, status: 'built-in', builtin: true }
];

export interface SettingsState {
  template: Template;
  themeDraft: Template | null;
  activeViews: string[];
  trainingWheels: boolean;
  gameMode: 'standard' | 'variant';
  isThemeEditorMode: boolean;
  activeEngineId: EngineId;
  botSettings: BotSettings;
  personalityProfiles: Record<string, BotPersonalityProfile>;
  chatSettings: ChatSettings;
  uiAppearance: UIAppearanceSettings;
  moveAssistSettings: MoveAssistSettings;
  pieceAnimations: PieceAnimationSettings;
  timeControl: TimeControlConfig;
  registeredBots: CustomBotConfig[];
  localProfile: LocalPlayerProfile;
  multiplayerServer: MultiplayerServerConfig;
  customRulesets: CustomRuleset[];
  customEvents: CustomEventDefinition[];
  animationDefinitions: AnimationDefinition[];
  animationRules: AnimationRule[];
  importedAssets: ImportedAssetRegistryEntry[];
  trustedAssetDomains: string[];
}

export type ImportableSettingsCategories = Partial<Pick<
  SettingsState,
  | 'personalityProfiles'
  | 'registeredBots'
  | 'localProfile'
  | 'multiplayerServer'
  | 'customRulesets'
  | 'customEvents'
  | 'animationDefinitions'
  | 'animationRules'
  | 'importedAssets'
>>;

interface SettingsContextType {
  settings: SettingsState;
  updateTemplate: (updates: Partial<Template>) => void;
  updateThemeDraft: (updates: Partial<Template>) => void;
  updateBotSettings: (updates: Partial<BotSettings>) => void;
  updateChatSettings: (updates: Partial<ChatSettings>) => void;
  updateUIAppearance: (updates: Partial<UIAppearanceSettings>) => void;
  updateMoveAssistSettings: (updates: Partial<MoveAssistSettings>) => void;
  updatePieceAnimations: (updates: Partial<PieceAnimationSettings>) => void;
  updateTimeControl: (updates: Partial<TimeControlConfig>) => void;
  updateMultiplayerServer: (updates: Partial<MultiplayerServerConfig>) => void;
  updatePersonalityProfile: (name: string, updates: Partial<BotPersonalityProfile>) => void;
  renamePersonalityProfile: (oldName: string, newName: string) => void;
  createPersonalityProfile: (baseName: string, newName: string) => void;
  setActiveEngineId: (engineId: EngineId) => void;
  registerBot: (config: CustomBotConfig) => void;
  updateBot: (id: string, updates: Partial<CustomBotConfig>) => void;
  removeBot: (id: string) => void;
  updateLocalProfile: (updates: Partial<LocalPlayerProfile>) => void;
  regenerateGuestId: () => void;
  createCustomRuleset: (ruleset: CustomRuleset) => void;
  updateCustomRuleset: (id: string, updates: Partial<CustomRuleset>) => void;
  deleteCustomRuleset: (id: string) => void;
  createCustomEvent: (eventDefinition: CustomEventDefinition) => void;
  updateCustomEvent: (id: string, updates: Partial<CustomEventDefinition>) => void;
  deleteCustomEvent: (id: string) => void;
  createAnimationDefinition: (definition: AnimationDefinition) => void;
  updateAnimationDefinition: (id: string, updates: Partial<AnimationDefinition>) => void;
  deleteAnimationDefinition: (id: string) => void;
  createAnimationRule: (rule: AnimationRule) => void;
  updateAnimationRule: (id: string, updates: Partial<AnimationRule>) => void;
  deleteAnimationRule: (id: string) => void;
  importSettingsCategories: (updates: ImportableSettingsCategories) => void;
  updateTrustedAssetDomains: (domains: string[]) => void;
  setThemeDraft: (t: Template | null) => void;
  toggleView: (viewId: string) => void;
  setTrainingWheels: (val: boolean) => void;
  setGameMode: (m: 'standard' | 'variant') => void;
  setThemeEditorMode: (m: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SETTINGS_STORAGE_KEY = 'chess-unleashed.settings.v1';
const SETTINGS_STORAGE_VERSION = 1;

type PersistedSettingsPayload = {
  version: number;
  settings: Partial<SettingsState>;
};

const createGuestId = () => {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (randomUuid) return `guest-${randomUuid}`;
  return `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const createDefaultSettings = (): SettingsState => ({
    template: defaultTemplate,
    themeDraft: null,
    activeViews: ['welcome', 'history'],
    trainingWheels: false,
    gameMode: 'standard',
    isThemeEditorMode: false,
    activeEngineId: 'standard',
    botSettings: {
      personality: 'Balanced',
      personalityTraits: BOT_PERSONALITY_PRESETS.Balanced.personalityTraits,
      difficulty: 'Intermediate',
      depth: 1,
      randomness: 0.3,
      capturePriority: 1,
      checkPriority: 1,
      avoidRepetition: true,
      thinkTime: 600,
      showMoveExplanation: true,
      botChatEnabled: true
    },
    personalityProfiles: DEFAULT_BOT_PERSONALITY_PROFILES,
    chatSettings: {
      position: 'right',
      lineCount: 3,
      floatingPos: { x: 100, y: 100 },
      style: {
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontSize: 13,
        messageSpacing: 8
      }
    },
    uiAppearance: {
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      baseFontSize: 14,
      accentColor: '#4f46e5',
      density: 'comfortable',
      showTipsBoard: true,
      tipsRotationSeconds: 12,
      welcomePanelColor: '#ffffff',
      welcomePanelFrameColor: '#d7e0e7',
      welcomePanelFrameMode: 'custom',
      welcomeSidebarContainerColor: '#fdf6e3',
      welcomeSidebarContainerFrameColor: '#eee8d5',
      welcomeSidebarContainerFrameMode: 'custom',
      panelOpacity: 100,
      panelBackdropBlur: 0,
      overlayBackdropOpacity: 20,
      overlayContentBlur: 10,
      buttonStyle: 'rounded',
      sidebarStyle: 'flat',
      panelBackgroundColor: '#ffffff',
      appBackgroundColor: '#f5f5f5',
      toolbarBackgroundColor: '#2c3e50',
      tipsMessages: [
        "Tip: Use Let's Play to start a bot, local, or multiplayer game.",
        'Did you know? Knights are the only pieces that can jump.',
        'Try importing custom pieces from Environment -> Look -> Pieces.',
        'Chess fact: Castling is the only move where two pieces move at once.',
        'Tip: Save your favorite setup as an ExperiencePackage.'
      ]
    },
    moveAssistSettings: {
      hoverPieceIdentity: true,
      hoverPieceIdentityOnlineOnly: false,
      hoverPieceGlow: true
    },
    pieceAnimations: {
      enabled: true,
      movementSpeedMs: 220,
      easing: 'ease-in-out',
      captureAnimation: true,
      promotionAnimation: true,
      defaultAnimationId: 'anim-slide',
      movementScope: 'all'
    },
    timeControl: {
      enabled: false,
      initialTimeSeconds: 300,
      incrementSeconds: 0,
      mode: 'standard',
      placement: 'right',
      manualClockPress: false,
      behavior: 'static',
      draggablePosition: { x: 24, y: 24 }
    },
    registeredBots: DEFAULT_REGISTERED_BOTS,
    localProfile: {
      displayName: 'Guest Player',
      profileImage: '',
      guestId: createGuestId(),
      profileType: 'guest',
      isGuest: true,
      officialId: null
    },
    multiplayerServer: {
      mode: 'home',
      homeUrl: 'localhost',
      customUrl: ''
    },
    customRulesets: [],
    customEvents: [],
    animationDefinitions: DEFAULT_ANIMATION_DEFINITIONS,
    animationRules: [],
    importedAssets: [],
    trustedAssetDomains: ['raw.githubusercontent.com', 'upload.wikimedia.org', 'cdn.pixabay.com', 'freesound.org']
});

const mergePersistedSettings = (saved: Partial<SettingsState>): SettingsState => {
  const defaults = createDefaultSettings();
  const mergeDefaultRegisteredBots = (savedBots: CustomBotConfig[] = []) => {
    const next = savedBots.map(bot => {
      if (!bot.builtin) return bot;
      const currentDefault = defaults.registeredBots.find(d => d.id === bot.id);
      return currentDefault ? { ...currentDefault } : bot;
    });
    defaults.registeredBots.forEach(defaultBot => {
      const alreadyPresent = next.some(bot => bot.id === defaultBot.id || bot.path === defaultBot.path);
      if (!alreadyPresent) next.push(defaultBot);
    });
    return next;
  };
  const mergeDefaultAnimations = (savedAnimations: AnimationDefinition[] = []) => {
    const next = [...savedAnimations];
    DEFAULT_ANIMATION_DEFINITIONS.forEach(defaultAnimation => {
      if (!next.some(animation => animation.id === defaultAnimation.id)) next.push(defaultAnimation);
    });
    return next;
  };

  return {
    ...defaults,
    ...saved,
    template: {
      ...defaults.template,
      ...saved.template,
      pieceTheme: {
        ...defaults.template.pieceTheme,
        ...saved.template?.pieceTheme
      },
      whitePieceTheme: {
        ...defaults.template.whitePieceTheme!,
        ...saved.template?.whitePieceTheme
      },
      blackPieceTheme: {
        ...defaults.template.blackPieceTheme!,
        ...saved.template?.blackPieceTheme
      },
      boardOverlay: {
        ...defaults.template.boardOverlay,
        ...saved.template?.boardOverlay
      },
      background: {
        ...defaults.template.background,
        ...saved.template?.background
      },
      frameLayer: {
        ...defaults.template.frameLayer,
        ...saved.template?.frameLayer
      },
      timerAppearance: {
        ...defaults.template.timerAppearance,
        ...saved.template?.timerAppearance
      },
      audioControllerAppearance: {
        ...defaults.template.audioControllerAppearance,
        ...saved.template?.audioControllerAppearance
      }
    },
    themeDraft: null,
    isThemeEditorMode: false,
    activeViews: (saved.activeViews ?? defaults.activeViews).filter(viewId => viewId !== 'theme-editor'),
    botSettings: {
      ...defaults.botSettings,
      ...saved.botSettings
    },
    chatSettings: {
      ...defaults.chatSettings,
      ...saved.chatSettings,
      style: {
        ...defaults.chatSettings.style,
        ...saved.chatSettings?.style
      }
    },
    uiAppearance: {
      ...defaults.uiAppearance,
      ...saved.uiAppearance
    },
    moveAssistSettings: {
      ...defaults.moveAssistSettings,
      ...saved.moveAssistSettings
    },
    pieceAnimations: {
      ...defaults.pieceAnimations,
      ...saved.pieceAnimations
    },
    timeControl: {
      ...defaults.timeControl,
      ...saved.timeControl
    },
    multiplayerServer: {
      ...defaults.multiplayerServer,
      ...saved.multiplayerServer
    },
    customRulesets: saved.customRulesets ?? defaults.customRulesets,
    customEvents: saved.customEvents ?? defaults.customEvents,
    animationDefinitions: mergeDefaultAnimations(saved.animationDefinitions ?? defaults.animationDefinitions),
    animationRules: saved.animationRules ?? defaults.animationRules,
    importedAssets: saved.importedAssets ?? defaults.importedAssets,
    trustedAssetDomains: saved.trustedAssetDomains ?? defaults.trustedAssetDomains,
    registeredBots: mergeDefaultRegisteredBots(saved.registeredBots?.length ? saved.registeredBots : defaults.registeredBots),
    localProfile: {
      ...defaults.localProfile,
      ...saved.localProfile,
      guestId: saved.localProfile?.guestId || defaults.localProfile.guestId,
      profileType: saved.localProfile?.profileType ?? 'guest',
      isGuest: saved.localProfile?.profileType ? saved.localProfile.profileType === 'guest' : true,
      officialId: saved.localProfile?.officialId ?? null
    },
    personalityProfiles: {
      ...defaults.personalityProfiles,
      ...saved.personalityProfiles
    }
  };
};

const loadPersistedSettings = (): SettingsState => {
  if (typeof window === 'undefined') return createDefaultSettings();

  try {
    const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) return createDefaultSettings();
    const parsed = JSON.parse(stored) as PersistedSettingsPayload;
    if (parsed.version !== SETTINGS_STORAGE_VERSION || !parsed.settings) return createDefaultSettings();
    return mergePersistedSettings(stripBlobUrls(parsed.settings));
  } catch (error) {
    console.warn('Failed to load persisted Chess Unleashed settings:', error);
    return createDefaultSettings();
  }
};

// Recursively strip blob: URLs only — used on load since blob: are always stale after reload
const stripBlobUrls = <T,>(value: T): T => {
  if (typeof value === 'string') return (value.startsWith('blob:') ? '' : value) as T;
  if (Array.isArray(value)) return value.map(stripBlobUrls) as T;
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as object)) {
      out[key] = stripBlobUrls((value as Record<string, unknown>)[key]);
    }
    return out as T;
  }
  return value;
};

// Recursively strip blob: URLs and (when stripAllData or above threshold) data: URLs — used on save
const MAX_PERSIST_URL_BYTES = 200_000;

const stripAssetUrls = <T,>(value: T, stripAllData: boolean): T => {
  if (typeof value === 'string') {
    if (value.startsWith('blob:')) return '' as T;
    if (!value.startsWith('data:')) return value;
    if (stripAllData || value.length > MAX_PERSIST_URL_BYTES) return '' as T;
    return value;
  }
  if (Array.isArray(value)) return value.map(v => stripAssetUrls(v, stripAllData)) as T;
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as object)) {
      out[key] = stripAssetUrls((value as Record<string, unknown>)[key], stripAllData);
    }
    return out as T;
  }
  return value;
};

// Overwrite the three applied template layer fields with blob-stripped versions from live state,
// so these are always persisted regardless of size (they're the primary user-facing applied images)
const withAppliedLayerImages = (base: Partial<SettingsState>, live: SettingsState): Partial<SettingsState> => ({
  ...base,
  template: {
    ...(base.template as Template),
    background: stripBlobUrls(live.template.background),
    boardOverlay: stripBlobUrls(live.template.boardOverlay),
    frameLayer: stripBlobUrls(live.template.frameLayer)
  }
});

let persistFallbackWarned = false;

// Normal: strip blob: everywhere + strip large data: from nonessential fields;
// always restore the three applied layer images from live state
const toPersistedSettings = (settings: SettingsState): Partial<SettingsState> =>
  withAppliedLayerImages(
    stripAssetUrls({
      ...settings,
      themeDraft: null,
      isThemeEditorMode: false,
      activeViews: settings.activeViews.filter(id => id !== 'theme-editor'),
      importedAssets: []
    }, false),
    settings
  );

// Compact: strip ALL data: from nonessential fields, still restore applied layer images
const toCompactPersistedSettings = (settings: SettingsState): Partial<SettingsState> =>
  withAppliedLayerImages(
    stripAssetUrls({
      ...settings,
      themeDraft: null,
      isThemeEditorMode: false,
      activeViews: settings.activeViews.filter(id => id !== 'theme-editor'),
      importedAssets: [],
      customEvents: [],
      animationRules: []
    }, true),
    settings
  );

// Emergency: strip ALL data: everywhere including applied layer images, clear all nonessential arrays
const toEmergencyPersistedSettings = (settings: SettingsState): Partial<SettingsState> =>
  stripAssetUrls({
    ...settings,
    themeDraft: null,
    isThemeEditorMode: false,
    activeViews: settings.activeViews.filter(id => id !== 'theme-editor'),
    importedAssets: [],
    customEvents: [],
    customRulesets: [],
    animationRules: []
  }, true);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SettingsState>(loadPersistedSettings);

  useEffect(() => {
    const persist = (settingsPayload: Partial<SettingsState>) => {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
        version: SETTINGS_STORAGE_VERSION,
        settings: settingsPayload
      }));
    };

    try {
      persist(toPersistedSettings(settings));
    } catch {
      try {
        persist(toCompactPersistedSettings(settings));
        if (!persistFallbackWarned) {
          persistFallbackWarned = true;
          console.warn('[Chess Unleashed] Settings payload was large; non-essential asset data excluded from save.');
        }
      } catch {
        try {
          persist(toEmergencyPersistedSettings(settings));
          if (!persistFallbackWarned) {
            persistFallbackWarned = true;
            console.warn('[Chess Unleashed] Settings saved in emergency mode; applied images may not persist after reload.');
          }
        } catch (err) {
          console.warn('[Chess Unleashed] Failed to persist settings after all fallbacks:', err);
        }
      }
    }
  }, [settings]);

  const updateTemplate = (updates: Partial<Template>) => setSettings(s => ({ ...s, template: { ...s.template, ...updates } }));
  const updateThemeDraft = (updates: Partial<Template>) => setSettings(s => ({ ...s, themeDraft: s.themeDraft ? { ...s.themeDraft, ...updates } : null }));
  const updateBotSettings = (updates: Partial<BotSettings>) => setSettings(s => ({ ...s, botSettings: { ...s.botSettings, ...updates } }));
  const updateUIAppearance = (updates: Partial<UIAppearanceSettings>) => setSettings(s => ({ ...s, uiAppearance: { ...s.uiAppearance, ...updates } }));
  const updateMoveAssistSettings = (updates: Partial<MoveAssistSettings>) => setSettings(s => ({ ...s, moveAssistSettings: { ...s.moveAssistSettings, ...updates } }));
  const updatePieceAnimations = (updates: Partial<PieceAnimationSettings>) => setSettings(s => ({ ...s, pieceAnimations: { ...s.pieceAnimations, ...updates } }));
  const updateTimeControl = (updates: Partial<TimeControlConfig>) => setSettings(s => ({ ...s, timeControl: { ...s.timeControl, ...updates } }));
  const updateMultiplayerServer = (updates: Partial<MultiplayerServerConfig>) => setSettings(s => ({ ...s, multiplayerServer: { ...s.multiplayerServer, ...updates } }));
  const updateChatSettings = (updates: Partial<ChatSettings>) => setSettings(s => ({
    ...s,
    chatSettings: {
      ...s.chatSettings,
      ...updates,
      style: updates.style ? { ...s.chatSettings.style, ...updates.style } : s.chatSettings.style
    }
  }));
  const updatePersonalityProfile = (name: string, updates: Partial<BotPersonalityProfile>) => setSettings(s => ({
    ...s,
    personalityProfiles: {
      ...s.personalityProfiles,
      [name]: { ...s.personalityProfiles[name], ...updates }
    }
  }));
  const renamePersonalityProfile = (oldName: string, newName: string) => setSettings(s => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName || s.personalityProfiles[trimmed]) return s;
    const { [oldName]: profile, ...rest } = s.personalityProfiles;
    return {
      ...s,
      personalityProfiles: {
        ...rest,
        [trimmed]: { ...profile, name: trimmed, builtin: false }
      },
      botSettings: s.botSettings.personality === oldName ? { ...s.botSettings, personality: trimmed } : s.botSettings
    };
  });
  const createPersonalityProfile = (baseName: string, newName: string) => setSettings(s => {
    const trimmed = newName.trim();
    const base = s.personalityProfiles[baseName];
    if (!trimmed || !base || s.personalityProfiles[trimmed]) return s;
    const profile = JSON.parse(JSON.stringify(base)) as BotPersonalityProfile;
    return {
      ...s,
      personalityProfiles: {
        ...s.personalityProfiles,
        [trimmed]: { ...profile, name: trimmed, builtin: false }
      }
    };
  });
  const setActiveEngineId = (activeEngineId: EngineId) => setSettings(s => ({ ...s, activeEngineId }));
  const registerBot = (config: CustomBotConfig) => setSettings(s => {
    const duplicate = s.registeredBots.some(bot => bot.id === config.id || bot.path === config.path);
    return duplicate ? s : { ...s, registeredBots: [...s.registeredBots, config] };
  });
  const updateBot = (id: string, updates: Partial<CustomBotConfig>) => setSettings(s => ({
    ...s,
    registeredBots: s.registeredBots.map(bot =>
      bot.id === id && !bot.builtin ? { ...bot, ...updates, id: bot.id } : bot
    )
  }));
  const removeBot = (id: string) => setSettings(s => ({
    ...s,
    registeredBots: s.registeredBots.filter(b => b.id !== id || b.builtin),
    activeEngineId: s.activeEngineId === id ? 'standard' : s.activeEngineId
  }));
  const updateLocalProfile = (updates: Partial<LocalPlayerProfile>) => setSettings(s => ({
    ...s,
    localProfile: {
      ...s.localProfile,
      ...updates,
      isGuest: updates.profileType ? updates.profileType === 'guest' : s.localProfile.isGuest,
      officialId: updates.profileType === 'official' ? updates.officialId ?? s.localProfile.officialId : updates.officialId ?? s.localProfile.officialId
    }
  }));
  const regenerateGuestId = () => setSettings(s => ({
    ...s,
    localProfile: {
      ...s.localProfile,
      guestId: createGuestId(),
      profileType: 'guest',
      isGuest: true,
      officialId: null
    }
  }));
  const createCustomRuleset = (ruleset: CustomRuleset) => setSettings(s => ({
    ...s,
    customRulesets: [...s.customRulesets, ruleset]
  }));
  const updateCustomRuleset = (id: string, updates: Partial<CustomRuleset>) => setSettings(s => ({
    ...s,
    customRulesets: s.customRulesets.map(ruleset =>
      ruleset.id === id ? { ...ruleset, ...updates, status: updates.status ?? 'draft' } : ruleset
    )
  }));
  const deleteCustomRuleset = (id: string) => setSettings(s => ({
    ...s,
    customRulesets: s.customRulesets.filter(ruleset => ruleset.id !== id)
  }));
  const createCustomEvent = (eventDefinition: CustomEventDefinition) => setSettings(s => ({
    ...s,
    customEvents: [...s.customEvents, eventDefinition]
  }));
  const updateCustomEvent = (id: string, updates: Partial<CustomEventDefinition>) => setSettings(s => ({
    ...s,
    customEvents: s.customEvents.map(eventDefinition =>
      eventDefinition.id === id ? { ...eventDefinition, ...updates, id: eventDefinition.id } : eventDefinition
    )
  }));
  const deleteCustomEvent = (id: string) => setSettings(s => ({
    ...s,
    customEvents: s.customEvents.filter(eventDefinition => eventDefinition.id !== id)
  }));
  const createAnimationDefinition = (definition: AnimationDefinition) => setSettings(s => ({
    ...s,
    animationDefinitions: s.animationDefinitions.some(animation => animation.id === definition.id)
      ? s.animationDefinitions
      : [...s.animationDefinitions, definition]
  }));
  const updateAnimationDefinition = (id: string, updates: Partial<AnimationDefinition>) => setSettings(s => ({
    ...s,
    animationDefinitions: s.animationDefinitions.map(animation =>
      animation.id === id && !animation.builtin ? { ...animation, ...updates, id: animation.id, builtin: animation.builtin } : animation
    )
  }));
  const deleteAnimationDefinition = (id: string) => setSettings(s => ({
    ...s,
    animationDefinitions: s.animationDefinitions.filter(animation => animation.id !== id || animation.builtin),
    animationRules: s.animationRules.filter(rule => rule.animationId !== id),
    pieceAnimations: s.pieceAnimations.defaultAnimationId === id
      ? { ...s.pieceAnimations, defaultAnimationId: 'anim-slide', enabled: true, movementSpeedMs: 220, easing: 'ease-in-out' }
      : s.pieceAnimations
  }));
  const createAnimationRule = (rule: AnimationRule) => setSettings(s => ({
    ...s,
    animationRules: s.animationRules.some(existing => existing.eventId === rule.eventId && existing.animationId === rule.animationId && existing.target === rule.target)
      ? s.animationRules
      : [...s.animationRules, rule]
  }));
  const updateAnimationRule = (id: string, updates: Partial<AnimationRule>) => setSettings(s => ({
    ...s,
    animationRules: s.animationRules.map(rule => rule.id === id ? { ...rule, ...updates, id: rule.id } : rule)
  }));
  const deleteAnimationRule = (id: string) => setSettings(s => ({
    ...s,
    animationRules: s.animationRules.filter(rule => rule.id !== id)
  }));
  const mergeById = <T extends { id: string }>(existing: T[], incoming: T[]) => {
    const next = [...existing];
    incoming.forEach(item => {
      const index = next.findIndex(existingItem => existingItem.id === item.id);
      if (index >= 0) next[index] = item;
      else next.push(item);
    });
    return next;
  };
  const importSettingsCategories = (updates: ImportableSettingsCategories) => setSettings(s => ({
    ...s,
    ...(updates.personalityProfiles ? { personalityProfiles: { ...s.personalityProfiles, ...updates.personalityProfiles } } : {}),
    ...(updates.registeredBots ? { registeredBots: mergeById(s.registeredBots, updates.registeredBots) } : {}),
    ...(updates.localProfile ? { localProfile: { ...s.localProfile, ...updates.localProfile } } : {}),
    ...(updates.multiplayerServer ? { multiplayerServer: { ...s.multiplayerServer, ...updates.multiplayerServer } } : {}),
    ...(updates.customRulesets ? { customRulesets: mergeById(s.customRulesets, updates.customRulesets) } : {}),
    ...(updates.customEvents ? { customEvents: mergeById(s.customEvents, updates.customEvents) } : {}),
    ...(updates.animationDefinitions ? { animationDefinitions: mergeById(s.animationDefinitions, updates.animationDefinitions) } : {}),
    ...(updates.animationRules ? { animationRules: mergeById(s.animationRules, updates.animationRules) } : {}),
    ...(updates.importedAssets ? { importedAssets: mergeById(s.importedAssets, updates.importedAssets) } : {})
  }));
  const updateTrustedAssetDomains = (trustedAssetDomains: string[]) => setSettings(s => ({ ...s, trustedAssetDomains }));
  const setThemeDraft = (themeDraft: Template | null) => setSettings(s => ({ ...s, themeDraft }));
  const setThemeEditorMode = (isThemeEditorMode: boolean) => setSettings(s => ({ ...s, isThemeEditorMode }));
  const setTrainingWheels = (trainingWheels: boolean) => setSettings(s => ({ ...s, trainingWheels }));
  const setGameMode = (gameMode: 'standard' | 'variant') => setSettings(s => ({ ...s, gameMode }));
  
  const toggleView = (viewId: string) => setSettings(s => {
      const active = s.activeViews.includes(viewId);
      if (!active) {
        eventBus.emit({
          type: 'panel.opened',
          payload: { panelViewId: viewId, viewId }
        });
      }
      return { ...s, activeViews: active ? s.activeViews.filter(v => v !== viewId) : [...s.activeViews, viewId] };
  });

  return (
    <SettingsContext.Provider value={{ settings, updateTemplate, updateThemeDraft, updateBotSettings, updateChatSettings, updateUIAppearance, updateMoveAssistSettings, updatePieceAnimations, updateTimeControl, updateMultiplayerServer, updatePersonalityProfile, renamePersonalityProfile, createPersonalityProfile, setActiveEngineId, registerBot, updateBot, removeBot, updateLocalProfile, regenerateGuestId, createCustomRuleset, updateCustomRuleset, deleteCustomRuleset, createCustomEvent, updateCustomEvent, deleteCustomEvent, createAnimationDefinition, updateAnimationDefinition, deleteAnimationDefinition, createAnimationRule, updateAnimationRule, deleteAnimationRule, importSettingsCategories, updateTrustedAssetDomains, setThemeDraft, toggleView, setTrainingWheels, setGameMode, setThemeEditorMode }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};
