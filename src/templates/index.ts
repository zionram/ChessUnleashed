import { defaultTemplate, type Template, type LayerConfig, type PieceThemeConfig, type TimerAppearanceConfig } from './defaultTemplate';
import { darkTemplate } from './darkTemplate';

export { defaultTemplate, darkTemplate, type Template, type LayerConfig, type PieceThemeConfig, type TimerAppearanceConfig };

export const templates: Record<string, Template> = {
  [defaultTemplate.id]: defaultTemplate,
  [darkTemplate.id]: darkTemplate,
};

export const getTemplate = (id: string): Template => {
  return templates[id] || defaultTemplate;
};
