import type { SettingsState } from '../context/SettingsContext';

export type ConfigValidationSeverity = 'warning' | 'error';

export interface ConfigValidationIssue {
  severity: ConfigValidationSeverity;
  message: string;
  affectedSettingPaths: string[];
  suggestedFix?: string;
}

export interface ConfigValidationResult {
  valid: boolean;
  issues: ConfigValidationIssue[];
}

export interface ConfigValidationContext {
  settings: SettingsState;
}

export type ConfigValidator = (context: ConfigValidationContext) => ConfigValidationIssue[];
