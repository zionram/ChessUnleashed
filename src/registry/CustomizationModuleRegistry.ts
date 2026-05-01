export type CustomizationModuleCategory = 'appearance' | 'audio' | 'gameplay' | 'events' | 'packages';

export type CustomizationFieldType = 'color' | 'range' | 'select' | 'checkbox' | 'text' | 'textarea' | 'image' | 'file' | 'action';

export interface CustomizationFieldConfig {
  id: string;
  label: string;
  type: CustomizationFieldType;
  settingsPath: string;
}

export interface CustomizationModuleConfig {
  id: string;
  label: string;
  category: CustomizationModuleCategory;
  settingsPath: string;
  fields: CustomizationFieldConfig[];
  packageKeys?: string[];
}

const modules: CustomizationModuleConfig[] = [];

export const registerCustomizationModule = (config: CustomizationModuleConfig) => {
  if (modules.find(module => module.id === config.id)) return;
  modules.push(config);
};

export const getRegisteredCustomizationModules = () => [...modules];

registerCustomizationModule({
  id: 'squares',
  label: 'Square Colors',
  category: 'appearance',
  settingsPath: 'template.boardColors',
  packageKeys: ['boardColors'],
  fields: [
    { id: 'light', label: 'Light', type: 'color', settingsPath: 'template.boardColors.light' },
    { id: 'dark', label: 'Dark', type: 'color', settingsPath: 'template.boardColors.dark' },
    { id: 'selected', label: 'Selected', type: 'color', settingsPath: 'template.boardColors.selected' },
    { id: 'moveTarget', label: 'Target', type: 'color', settingsPath: 'template.boardColors.moveTarget' }
  ]
});
