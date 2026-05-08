import obsidianExperienceText from './obsidian/experience.json?raw';
import type { SettingsState } from '../../context/SettingsContext';

type ObsidianTemplate = SettingsState['template'];

export type BuiltInObsidianDefaults = Partial<SettingsState> & {
  rules?: {
    gameMode?: SettingsState['gameMode'];
    trainingWheels?: boolean;
  };
};

const LEGACY_SRC_ASSETS_PREFIX = '/src/assets/';
const OBSIDIAN_THEME_ASSETS_PREFIX = '/src/assets/default-themes/obsidian/';
const DOUBLED_OBSIDIAN_THEME_ASSETS_PREFIX = `${OBSIDIAN_THEME_ASSETS_PREFIX}default-themes/obsidian/`;

const normalizeBuiltInAssetRef = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  if (value.startsWith(DOUBLED_OBSIDIAN_THEME_ASSETS_PREFIX)) {
    return `${OBSIDIAN_THEME_ASSETS_PREFIX}${value.slice(DOUBLED_OBSIDIAN_THEME_ASSETS_PREFIX.length)}`;
  }
  if (value.startsWith(OBSIDIAN_THEME_ASSETS_PREFIX)) return value;
  if (!value.startsWith(LEGACY_SRC_ASSETS_PREFIX)) return value;
  return `${OBSIDIAN_THEME_ASSETS_PREFIX}${value.slice(LEGACY_SRC_ASSETS_PREFIX.length)}`;
};

const normalizeAssetRefsDeep = <T,>(value: T): T => {
  if (Array.isArray(value)) return value.map(item => normalizeAssetRefsDeep(item)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        normalizeAssetRefsDeep(normalizeBuiltInAssetRef(entry))
      ])
    ) as T;
  }
  return normalizeBuiltInAssetRef(value) as T;
};

export const getBuiltInObsidianDefaults = (): BuiltInObsidianDefaults => {
  const parsed = JSON.parse(obsidianExperienceText) as { contents?: BuiltInObsidianDefaults };
  const contents = parsed.contents ?? {};
  const template = contents.template
    ? ({
        ...normalizeAssetRefsDeep(contents.template),
        id: contents.template.id || 'obsidian',
        name: contents.template.name || 'Obsidian'
      } as ObsidianTemplate)
    : undefined;

  return {
    ...contents,
    template
  };
};
