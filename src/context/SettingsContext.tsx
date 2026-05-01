import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { defaultTemplate, type Template } from '../templates';
import type { TimeControlConfig } from '../timer/TimerTypes';
import type { CustomRuleset } from '../rules/RulePackages';
import { eventBus } from '../events/EventBus';

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
}

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
}

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
  timeControl: TimeControlConfig;
  registeredBots: CustomBotConfig[];
  localProfile: LocalPlayerProfile;
  multiplayerServer: MultiplayerServerConfig;
  customRulesets: CustomRuleset[];
  customEvents: CustomEventDefinition[];
}

export type ImportableSettingsCategories = Partial<Pick<
  SettingsState,
  | 'personalityProfiles'
  | 'registeredBots'
  | 'localProfile'
  | 'multiplayerServer'
  | 'customRulesets'
  | 'customEvents'
>>;

interface SettingsContextType {
  settings: SettingsState;
  updateTemplate: (updates: Partial<Template>) => void;
  updateThemeDraft: (updates: Partial<Template>) => void;
  updateBotSettings: (updates: Partial<BotSettings>) => void;
  updateChatSettings: (updates: Partial<ChatSettings>) => void;
  updateUIAppearance: (updates: Partial<UIAppearanceSettings>) => void;
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
  importSettingsCategories: (updates: ImportableSettingsCategories) => void;
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
      tipsMessages: [
        "Tip: Use Let's Play to start a bot, local, or multiplayer game.",
        'Did you know? Knights are the only pieces that can jump.',
        'Try importing custom pieces from Environment -> Look -> Pieces.',
        'Chess fact: Castling is the only move where two pieces move at once.',
        'Tip: Save your favorite setup as an ExperiencePackage.'
      ]
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
    registeredBots: [
      { id: 'standard', name: 'Training Bot (Standard)', type: 'mock', path: 'internal' },
      { id: 'random', name: 'Random Bot', type: 'mock', path: 'internal' }
    ],
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
    customEvents: []
});

const mergePersistedSettings = (saved: Partial<SettingsState>): SettingsState => {
  const defaults = createDefaultSettings();

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
    registeredBots: saved.registeredBots?.length ? saved.registeredBots : defaults.registeredBots,
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
    return mergePersistedSettings(parsed.settings);
  } catch (error) {
    console.warn('Failed to load persisted Chess Unleashed settings:', error);
    return createDefaultSettings();
  }
};

const toPersistedSettings = (settings: SettingsState): Partial<SettingsState> => ({
  ...settings,
  themeDraft: null,
  isThemeEditorMode: false,
  activeViews: settings.activeViews.filter(viewId => viewId !== 'theme-editor')
});

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SettingsState>(loadPersistedSettings);

  useEffect(() => {
    try {
      const payload: PersistedSettingsPayload = {
        version: SETTINGS_STORAGE_VERSION,
        settings: toPersistedSettings(settings)
      };
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('Failed to persist Chess Unleashed settings:', error);
    }
  }, [settings]);

  const updateTemplate = (updates: Partial<Template>) => setSettings(s => ({ ...s, template: { ...s.template, ...updates } }));
  const updateThemeDraft = (updates: Partial<Template>) => setSettings(s => ({ ...s, themeDraft: s.themeDraft ? { ...s.themeDraft, ...updates } : null }));
  const updateBotSettings = (updates: Partial<BotSettings>) => setSettings(s => ({ ...s, botSettings: { ...s.botSettings, ...updates } }));
  const updateUIAppearance = (updates: Partial<UIAppearanceSettings>) => setSettings(s => ({ ...s, uiAppearance: { ...s.uiAppearance, ...updates } }));
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
  const registerBot = (config: CustomBotConfig) => setSettings(s => ({ ...s, registeredBots: [...s.registeredBots, config] }));
  const updateBot = (id: string, updates: Partial<CustomBotConfig>) => setSettings(s => ({
    ...s,
    registeredBots: s.registeredBots.map(bot =>
      bot.id === id && bot.type !== 'mock' ? { ...bot, ...updates, id: bot.id } : bot
    )
  }));
  const removeBot = (id: string) => setSettings(s => ({
    ...s,
    registeredBots: s.registeredBots.filter(b => b.id !== id),
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
    ...(updates.customEvents ? { customEvents: mergeById(s.customEvents, updates.customEvents) } : {})
  }));
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
    <SettingsContext.Provider value={{ settings, updateTemplate, updateThemeDraft, updateBotSettings, updateChatSettings, updateUIAppearance, updateTimeControl, updateMultiplayerServer, updatePersonalityProfile, renamePersonalityProfile, createPersonalityProfile, setActiveEngineId, registerBot, updateBot, removeBot, updateLocalProfile, regenerateGuestId, createCustomRuleset, updateCustomRuleset, deleteCustomRuleset, createCustomEvent, updateCustomEvent, deleteCustomEvent, importSettingsCategories, setThemeDraft, toggleView, setTrainingWheels, setGameMode, setThemeEditorMode }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};
