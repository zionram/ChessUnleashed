import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { nanoid } from 'nanoid';
import { eventBus } from '../events/EventBus';

export interface SoundAsset {
  id: string;
  name: string;
  url: string;
  fileType?: 'audio' | 'midi';
}

export interface AudioTrack {
  id: string;
  name: string;
  url: string;
}

export type AudioPlaybackMode = 'sequence' | 'repeat-playlist' | 'loop-track' | 'shuffle';

export interface AudioRule {
  id: string;
  name?: string;
  event: string;
  piece: string; // 'p','n','b','r','q','k' or 'any'
  side: string;  // 'w','b' or 'any'
  mode: string;  // 'local', 'vsComputer', 'multiplayer' or 'any'
  soundId: string;
  category?: string;
  target?: string;
  playback?: {
    allowOverlap?: boolean;
    playOnceUntilReset?: boolean;
    stopOtherSounds?: boolean;
    duckMusic?: boolean;
    pauseMusic?: boolean;
    resumeMusicAfter?: boolean;
    loopWhileEventTrue?: boolean;
    stopWhenEventEnds?: boolean;
  };
}

export interface AudioProfile {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  bgMusic: string | null;
  bgMusicName?: string | null;
  playlistName?: string | null;
  playlist?: AudioTrack[];
  currentTrackIndex?: number;
  playbackMode?: AudioPlaybackMode;
  library: SoundAsset[];
  rules: AudioRule[];
  ruleCategories?: string[];
  controller?: AudioControllerSettings;
}

export interface AudioCategorySetting {
  enabled: boolean;
  volume: number;
}

export interface AudioControllerSettings {
  muted: boolean;
  floating: boolean;
  floatingPos?: { x: number; y: number };
  categories: Record<string, AudioCategorySetting>;
}

interface AudioContextType {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  setMasterVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  bgMusic: string | null;
  setBgMusic: (url: string | null) => void;
  bgMusicName: string | null;
  playlistName: string | null;
  playlist: AudioTrack[];
  currentTrackIndex: number;
  playbackMode: AudioPlaybackMode;
  isMusicPlaying: boolean;
  musicProgress: number;
  musicDuration: number;
  setBackgroundMusicTrack: (url: string | null, name?: string | null) => void;
  addPlaylistTracks: (tracks: Array<Omit<AudioTrack, 'id'>>) => void;
  removePlaylistTrack: (trackId: string) => void;
  clearPlaylist: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  setPlaybackMode: (mode: AudioPlaybackMode) => void;
  playBackgroundMusic: () => void;
  pauseBackgroundMusic: () => void;
  stopBackgroundMusic: () => void;
  seekBackgroundMusic: (time: number) => void;
  
  library: SoundAsset[];
  addSound: (name: string, url: string, fileType?: SoundAsset['fileType']) => void;
  removeSound: (id: string) => void;
  renameSound: (id: string, name: string) => void;
  
  rules: AudioRule[];
  addRule: (rule: Omit<AudioRule, 'id'>) => void;
  updateRule: (id: string, updates: Partial<AudioRule>) => void;
  removeRule: (id: string) => void;
  updateRuleCategory: (ruleId: string, category: string) => void;
  ruleCategories: string[];
  addRuleCategory: (category: string) => void;

  controller: AudioControllerSettings;
  updateController: (updates: Partial<AudioControllerSettings>) => void;
  updateCategory: (eventName: string, updates: Partial<AudioCategorySetting>) => void;
  
  playEvent: (event: string, context?: { piece?: string; side?: string; mode?: string; active?: boolean }) => void;
  playLibrarySound: (id: string) => void;
  stopPreview: () => void;
  
  getCurrentProfile: () => AudioProfile;
  applyProfile: (profile: AudioProfile) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

const DEFAULT_LIBRARY: SoundAsset[] = [
  { id: 'def-move', name: 'Standard Move', url: 'https://images.chesscomfiles.com/chess-themes/sounds/_standard/default/move-self.mp3' },
  { id: 'def-cap', name: 'Standard Capture', url: 'https://images.chesscomfiles.com/chess-themes/sounds/_standard/default/capture.mp3' },
  { id: 'def-check', name: 'Standard Check', url: 'https://images.chesscomfiles.com/chess-themes/sounds/_standard/default/move-check.mp3' },
  { id: 'def-start', name: 'Game Start', url: 'https://images.chesscomfiles.com/chess-themes/sounds/_standard/default/game-start.mp3' },
  { id: 'def-end', name: 'Game End', url: 'https://images.chesscomfiles.com/chess-themes/sounds/_standard/default/game-end.mp3' }
];

const DEFAULT_RULES: AudioRule[] = [
  { id: 'r1', event: 'move', piece: 'any', side: 'any', mode: 'any', soundId: 'def-move', category: 'Piece Moves' },
  { id: 'r2', event: 'capture', piece: 'any', side: 'any', mode: 'any', soundId: 'def-cap', category: 'Captures' },
  { id: 'r3', event: 'check', piece: 'any', side: 'any', mode: 'any', soundId: 'def-check', category: 'Game Events' },
  { id: 'r4', event: 'gameStart', piece: 'any', side: 'any', mode: 'any', soundId: 'def-start', category: 'Game Events' },
  { id: 'r5', event: 'checkmate', piece: 'any', side: 'any', mode: 'any', soundId: 'def-end', category: 'Game Events' }
];

const DEFAULT_RULE_CATEGORIES = ['Piece Moves', 'Captures', 'Game Events', 'UI / Panel Events', 'Other Events'];

const DEFAULT_CONTROLLER: AudioControllerSettings = {
  muted: false,
  floating: false,
  floatingPos: { x: 120, y: 120 },
  categories: {
    move: { enabled: true, volume: 1 },
    capture: { enabled: true, volume: 1 },
    check: { enabled: true, volume: 1 },
    gameStart: { enabled: true, volume: 1 },
    checkmate: { enabled: true, volume: 1 }
  }
};

export const SUPPORTED_AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a', 'mid', 'midi'];

export const isSupportedAudioFile = (file: File) => {
  const extension = file.name.toLowerCase().split('.').pop() ?? '';
  if (SUPPORTED_AUDIO_EXTENSIONS.includes(extension)) return true;
  return file.type.startsWith('audio/');
};

const AUDIO_PROFILE_STORAGE_KEY = 'chess-unleashed.audio-profile.v1';
const AUDIO_PROFILE_STORAGE_VERSION = 1;

type PersistedAudioProfilePayload = {
  version: number;
  profile: AudioProfile;
};

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

const sanitizeAudioProfile = (profile: AudioProfile): AudioProfile => stripBlobUrls(profile);

const loadPersistedAudioProfile = (): Partial<AudioProfile> => {
  if (typeof window === 'undefined') return {};

  try {
    const stored = window.localStorage.getItem(AUDIO_PROFILE_STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as PersistedAudioProfilePayload;
    if (parsed.version !== AUDIO_PROFILE_STORAGE_VERSION || !parsed.profile) return {};
    const sanitized = sanitizeAudioProfile(parsed.profile);
    if (JSON.stringify(sanitized) !== JSON.stringify(parsed.profile)) {
      window.localStorage.setItem(AUDIO_PROFILE_STORAGE_KEY, JSON.stringify({ ...parsed, profile: sanitized }));
    }
    return sanitized;
  } catch (error) {
    console.warn('Failed to load persisted Chess Unleashed audio profile:', error);
    return {};
  }
};

export const AudioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [initialAudioProfile] = useState<Partial<AudioProfile>>(loadPersistedAudioProfile);
  const [masterVolume, setMasterVolume] = useState(initialAudioProfile.masterVolume ?? 0.5);
  const [musicVolume, setMusicVolume] = useState(initialAudioProfile.musicVolume ?? 0.5);
  const [sfxVolume, setSfxVolume] = useState(initialAudioProfile.sfxVolume ?? 0.7);
  const [bgMusic, setBgMusic] = useState<string | null>(initialAudioProfile.bgMusic ?? null);
  const [bgMusicName, setBgMusicName] = useState<string | null>(initialAudioProfile.bgMusicName ?? null);
  const [playlistName, setPlaylistName] = useState<string | null>(initialAudioProfile.playlistName ?? null);
  const [playlist, setPlaylist] = useState<AudioTrack[]>(initialAudioProfile.playlist ?? []);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(initialAudioProfile.currentTrackIndex ?? 0);
  const [playbackMode, setPlaybackMode] = useState<AudioPlaybackMode>(initialAudioProfile.playbackMode ?? 'sequence');
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicProgress, setMusicProgress] = useState(0);
  const [musicDuration, setMusicDuration] = useState(0);
  const [library, setLibrary] = useState<SoundAsset[]>(initialAudioProfile.library ?? DEFAULT_LIBRARY);
  const [rules, setRules] = useState<AudioRule[]>(initialAudioProfile.rules ?? DEFAULT_RULES);
  const [ruleCategories, setRuleCategories] = useState<string[]>(initialAudioProfile.ruleCategories ?? DEFAULT_RULE_CATEGORIES);
  const [controller, setController] = useState<AudioControllerSettings>({
    ...DEFAULT_CONTROLLER,
    ...initialAudioProfile.controller,
    categories: {
      ...DEFAULT_CONTROLLER.categories,
      ...(initialAudioProfile.controller?.categories || {})
    }
  });

  const musicRef = useRef<HTMLAudioElement | null>(null);
  const previewRef = useRef<HTMLAudioElement | null>(null);
  const statefulEffectRefs = useRef<Record<string, {
    audio: HTMLAudioElement;
    playback: NonNullable<AudioRule['playback']>;
    musicWasPlaying: boolean;
  }>>({});

  useEffect(() => {
    if (bgMusic) {
      if (!musicRef.current) {
        musicRef.current = new Audio(bgMusic);
      } else musicRef.current.src = bgMusic;
      musicRef.current.loop = playbackMode === 'loop-track';
      musicRef.current.play().then(() => setIsMusicPlaying(true)).catch(() => setIsMusicPlaying(false));
    } else {
      musicRef.current?.pause();
      musicRef.current = null;
      setIsMusicPlaying(false);
      setMusicProgress(0);
      setMusicDuration(0);
    }
  }, [bgMusic]);

  useEffect(() => {
    if (musicRef.current) musicRef.current.loop = playbackMode === 'loop-track';
  }, [playbackMode]);

  useEffect(() => {
    const audio = musicRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setMusicProgress(audio.currentTime || 0);
    const handleDurationChange = () => setMusicDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const handlePlay = () => setIsMusicPlaying(true);
    const handlePause = () => setIsMusicPlaying(false);
    const handleEnded = () => {
      if (playbackMode === 'loop-track') return;
      playNextTrackFromEnd();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('loadedmetadata', handleDurationChange);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('loadedmetadata', handleDurationChange);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [bgMusic, playbackMode, playlist, currentTrackIndex]);

  useEffect(() => {
    if (musicRef.current) musicRef.current.volume = controller.muted ? 0 : masterVolume * musicVolume;
  }, [masterVolume, musicVolume, controller.muted]);

  useEffect(() => {
    if (!isMusicPlaying || !musicRef.current) return;

    let frameId = 0;
    let lastUpdate = 0;
    const tick = (timestamp: number) => {
      if (timestamp - lastUpdate >= 100) {
        setMusicProgress(musicRef.current?.currentTime || 0);
        lastUpdate = timestamp;
      }
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [bgMusic, isMusicPlaying]);

  const playFile = (url: string, categoryVolume = 1, playback?: AudioRule['playback']) => {
    if (controller.muted) return;
    if (playback?.stopOtherSounds || !playback?.allowOverlap) previewRef.current?.pause();
    const musicWasPlaying = !!musicRef.current && !musicRef.current.paused;
    if (playback?.pauseMusic) musicRef.current?.pause();
    else if (playback?.duckMusic && musicRef.current) musicRef.current.volume = masterVolume * musicVolume * 0.35;
    const audio = new Audio(url);
    audio.volume = masterVolume * sfxVolume * categoryVolume;
    previewRef.current = audio;
    audio.onended = () => {
      if (playback?.duckMusic && musicRef.current) musicRef.current.volume = controller.muted ? 0 : masterVolume * musicVolume;
      if (playback?.pauseMusic && playback.resumeMusicAfter && musicWasPlaying) {
        musicRef.current?.play().catch(() => {});
      }
    };
    audio.play().catch(() => {});
  };

  const stopStatefulEffect = (eventName: string) => {
    const stateful = statefulEffectRefs.current[eventName];
    if (!stateful) return;
    stateful.audio.pause();
    stateful.audio.currentTime = 0;
    if (stateful.playback.duckMusic && musicRef.current) {
      musicRef.current.volume = controller.muted ? 0 : masterVolume * musicVolume;
    }
    if (stateful.playback.pauseMusic && stateful.playback.resumeMusicAfter && stateful.musicWasPlaying) {
      musicRef.current?.play().catch(() => {});
    }
    delete statefulEffectRefs.current[eventName];
  };

  const playEvent = (eventName: string, context?: { piece?: string; side?: string; mode?: string; active?: boolean }) => {
    if (context?.active === false) {
      stopStatefulEffect(eventName);
      return;
    }
    const category = controller.categories[eventName] ?? { enabled: true, volume: 1 };
    if (!category.enabled) return;

    let matches = rules.filter(r => r.event === eventName);
    matches = matches.filter(r => {
      const pMatch = r.piece === 'any' || r.piece === context?.piece;
      const sMatch = r.side === 'any' || r.side === context?.side;
      const mMatch = r.mode === 'any' || r.mode === context?.mode;
      return pMatch && sMatch && mMatch;
    });
    matches.sort((a, b) => {
      const score = (r: AudioRule) => (r.piece !== 'any' ? 1 : 0) + (r.side !== 'any' ? 1 : 0) + (r.mode !== 'any' ? 1 : 0);
      return score(b) - score(a);
    });
    if (matches.length > 0) {
      const sound = library.find(s => s.id === matches[0].soundId);
      if (sound) {
        const playback = matches[0].playback;
        if (playback?.loopWhileEventTrue || playback?.stopWhenEventEnds) {
          if (statefulEffectRefs.current[eventName]) return;
          const musicWasPlaying = !!musicRef.current && !musicRef.current.paused;
          if (playback.pauseMusic) musicRef.current?.pause();
          else if (playback.duckMusic && musicRef.current) musicRef.current.volume = masterVolume * musicVolume * 0.35;
          const audio = new Audio(sound.url);
          audio.loop = !!playback.loopWhileEventTrue;
          audio.volume = masterVolume * sfxVolume * category.volume;
          statefulEffectRefs.current[eventName] = {
            audio,
            playback,
            musicWasPlaying
          };
          audio.onended = () => {
            if (!audio.loop) {
              if (playback.duckMusic && musicRef.current) {
                musicRef.current.volume = controller.muted ? 0 : masterVolume * musicVolume;
              }
              if (playback.pauseMusic && playback.resumeMusicAfter && musicWasPlaying) {
                musicRef.current?.play().catch(() => {});
              }
              delete statefulEffectRefs.current[eventName];
            }
          };
          audio.play().catch(() => {
            delete statefulEffectRefs.current[eventName];
          });
        } else {
          playFile(sound.url, category.volume, playback);
        }
        eventBus.emit({
          type: 'sound.rule.played',
          payload: {
            eventName,
            ruleId: matches[0].id,
            ruleName: matches[0].name || matches[0].event,
            soundId: sound.id,
            soundName: sound.name
          }
        });
      }
    }
  };

  const playLibrarySound = (id: string) => {
    const sound = library.find(s => s.id === id);
    if (sound?.fileType === 'midi') {
      console.info('MIDI playback support pending:', sound.name);
      return;
    }
    if (sound) playFile(sound.url);
  };

  const setBackgroundMusicTrack = (url: string | null, name?: string | null) => {
    setBgMusic(url);
    setBgMusicName(name ?? null);
    setPlaylist(url ? [{ id: nanoid(), name: name ?? 'Custom music', url }] : []);
    setPlaylistName(url ? 'Single Track' : null);
    setCurrentTrackIndex(0);
  };

  const setTrackByIndex = (tracks: AudioTrack[], index: number) => {
    const track = tracks[index];
    if (!track) return;
    setCurrentTrackIndex(index);
    setBgMusic(track.url);
    setBgMusicName(track.name);
  };

  const addPlaylistTracks = (tracks: Array<Omit<AudioTrack, 'id'>>) => {
    if (!tracks.length) return;
    const nextTracks = tracks.map(track => ({ ...track, id: nanoid() }));
    setPlaylist(prev => {
      const combined = [...prev, ...nextTracks];
      if (!prev.length) setTrackByIndex(combined, 0);
      setPlaylistName(combined.length > 1 ? 'Custom Playlist' : 'Single Track');
      return combined;
    });
  };

  const removePlaylistTrack = (trackId: string) => {
    setPlaylist(prev => {
      const removedIndex = prev.findIndex(track => track.id === trackId);
      const next = prev.filter(track => track.id !== trackId);
      if (!next.length) {
        setBgMusic(null);
        setBgMusicName(null);
        setPlaylistName(null);
        setCurrentTrackIndex(0);
        return next;
      }

      const nextIndex = removedIndex >= 0 && removedIndex <= currentTrackIndex
        ? Math.max(0, currentTrackIndex - 1)
        : currentTrackIndex;
      setTrackByIndex(next, Math.min(nextIndex, next.length - 1));
      setPlaylistName(next.length > 1 ? 'Custom Playlist' : 'Single Track');
      return next;
    });
  };

  const clearPlaylist = () => {
    stopBackgroundMusic();
    setPlaylist([]);
    setBgMusic(null);
    setBgMusicName(null);
    setPlaylistName(null);
    setCurrentTrackIndex(0);
  };

  const getNextIndex = () => {
    if (!playlist.length) return -1;
    if (playbackMode === 'shuffle' && playlist.length > 1) {
      let nextIndex = Math.floor(Math.random() * playlist.length);
      if (nextIndex === currentTrackIndex) nextIndex = (nextIndex + 1) % playlist.length;
      return nextIndex;
    }
    if (currentTrackIndex < playlist.length - 1) return currentTrackIndex + 1;
    if (playbackMode === 'repeat-playlist') return 0;
    return -1;
  };

  const playNextTrackFromEnd = () => {
    const nextIndex = getNextIndex();
    if (nextIndex < 0) {
      stopBackgroundMusic();
      return;
    }
    setTrackByIndex(playlist, nextIndex);
  };

  const nextTrack = () => {
    const nextIndex = getNextIndex();
    if (nextIndex >= 0) setTrackByIndex(playlist, nextIndex);
  };

  const previousTrack = () => {
    if (!playlist.length) return;
    const previousIndex = currentTrackIndex > 0
      ? currentTrackIndex - 1
      : playbackMode === 'repeat-playlist'
        ? playlist.length - 1
        : 0;
    setTrackByIndex(playlist, previousIndex);
  };

  const playBackgroundMusic = () => {
    if (!musicRef.current || controller.muted) return;
    musicRef.current.play().then(() => setIsMusicPlaying(true)).catch(() => setIsMusicPlaying(false));
  };

  const pauseBackgroundMusic = () => {
    musicRef.current?.pause();
    setIsMusicPlaying(false);
  };

  const stopBackgroundMusic = () => {
    if (musicRef.current) {
      musicRef.current.pause();
      musicRef.current.currentTime = 0;
    }
    setMusicProgress(0);
    setIsMusicPlaying(false);
  };

  const seekBackgroundMusic = (time: number) => {
    if (!musicRef.current) return;
    musicRef.current.currentTime = time;
    setMusicProgress(time);
  };

  const stopPreview = () => {
    previewRef.current?.pause();
    previewRef.current = null;
  };

  const addSound = (name: string, url: string, fileType: SoundAsset['fileType'] = 'audio') => setLibrary(prev => [...prev, { id: nanoid(), name, url, fileType }]);
  const removeSound = (id: string) => setLibrary(prev => prev.filter(s => s.id !== id));
  const renameSound = (id: string, name: string) => setLibrary(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  const addRule = (rule: Omit<AudioRule, 'id'>) => setRules(prev => [...prev, { ...rule, id: nanoid() }]);
  const updateRule = (id: string, updates: Partial<AudioRule>) => setRules(prev => prev.map(rule => rule.id === id ? { ...rule, ...updates, id: rule.id } : rule));
  const removeRule = (id: string) => setRules(prev => prev.filter(r => r.id !== id));
  const updateRuleCategory = (ruleId: string, category: string) => setRules(prev => prev.map(rule => rule.id === ruleId ? { ...rule, category } : rule));
  const addRuleCategory = (category: string) => {
    const trimmed = category.trim();
    if (!trimmed) return;
    setRuleCategories(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
  };
  const updateController = (updates: Partial<AudioControllerSettings>) => setController(prev => ({ ...prev, ...updates }));
  const updateCategory = (eventName: string, updates: Partial<AudioCategorySetting>) => setController(prev => ({
    ...prev,
    categories: {
      ...prev.categories,
      [eventName]: {
        enabled: prev.categories[eventName]?.enabled ?? true,
        volume: prev.categories[eventName]?.volume ?? 1,
        ...updates
      }
    }
  }));

  const getCurrentProfile = (): AudioProfile => ({
    masterVolume, musicVolume, sfxVolume, bgMusic, bgMusicName, playlistName, playlist, currentTrackIndex, playbackMode, library, rules, ruleCategories, controller
  });

  const applyProfile = (p: AudioProfile) => {
    const sanitized = sanitizeAudioProfile(p);
    if (sanitized.masterVolume !== undefined) setMasterVolume(sanitized.masterVolume);
    if (sanitized.musicVolume !== undefined) setMusicVolume(sanitized.musicVolume);
    if (sanitized.sfxVolume !== undefined) setSfxVolume(sanitized.sfxVolume);
    if (sanitized.bgMusic !== undefined) setBgMusic(sanitized.bgMusic);
    if (sanitized.bgMusicName !== undefined) setBgMusicName(sanitized.bgMusicName);
    if (sanitized.playlistName !== undefined) setPlaylistName(sanitized.playlistName);
    if (sanitized.playlist) setPlaylist(sanitized.playlist);
    if (sanitized.currentTrackIndex !== undefined) setCurrentTrackIndex(sanitized.currentTrackIndex);
    if (sanitized.playbackMode) setPlaybackMode(sanitized.playbackMode);
    if (sanitized.library) setLibrary(sanitized.library);
    if (sanitized.rules) setRules(sanitized.rules);
    if (sanitized.ruleCategories) setRuleCategories([...DEFAULT_RULE_CATEGORIES, ...sanitized.ruleCategories.filter(category => !DEFAULT_RULE_CATEGORIES.includes(category))]);
    if (sanitized.controller) {
      setController({
        ...DEFAULT_CONTROLLER,
        ...sanitized.controller,
        categories: {
          ...DEFAULT_CONTROLLER.categories,
          ...(sanitized.controller.categories || {})
        }
      });
    }
  };

  useEffect(() => {
    try {
      const payload: PersistedAudioProfilePayload = {
        version: AUDIO_PROFILE_STORAGE_VERSION,
        profile: sanitizeAudioProfile(getCurrentProfile())
      };
      window.localStorage.setItem(AUDIO_PROFILE_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('Failed to persist Chess Unleashed audio profile:', error);
    }
  }, [
    masterVolume,
    musicVolume,
    sfxVolume,
    bgMusic,
    bgMusicName,
    playlistName,
    playlist,
    currentTrackIndex,
    playbackMode,
    library,
    rules,
    ruleCategories,
    controller
  ]);

  return (
    <AudioContext.Provider value={{
      masterVolume, musicVolume, sfxVolume, setMasterVolume, setMusicVolume, setSfxVolume,
      bgMusic, setBgMusic, bgMusicName, playlistName, playlist, currentTrackIndex, playbackMode,
      isMusicPlaying, musicProgress, musicDuration,
      setBackgroundMusicTrack, addPlaylistTracks, removePlaylistTrack, clearPlaylist, nextTrack, previousTrack, setPlaybackMode,
      playBackgroundMusic, pauseBackgroundMusic, stopBackgroundMusic, seekBackgroundMusic,
      library, addSound, removeSound, renameSound,
      rules, addRule, updateRule, removeRule, updateRuleCategory, ruleCategories, addRuleCategory,
      controller, updateController, updateCategory,
      playEvent, playLibrarySound, stopPreview, getCurrentProfile, applyProfile
    }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio must be used within an AudioProvider');
  return context;
};
