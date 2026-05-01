import type { ConfigValidationContext, ConfigValidationIssue, ConfigValidationResult, ConfigValidator } from './ConfigValidationTypes';
import { validateTimerConfig } from './validators/timerValidator';

const validators: ConfigValidator[] = [];

export const registerConfigValidator = (validator: ConfigValidator) => {
  if (validators.includes(validator)) return;
  validators.push(validator);
};

export const validateConfig = (context: ConfigValidationContext): ConfigValidationResult => {
  const issues = validators.reduce<ConfigValidationIssue[]>(
    (allIssues, validator) => [...allIssues, ...validator(context)],
    []
  );

  return {
    valid: !issues.some(issue => issue.severity === 'error'),
    issues
  };
};

registerConfigValidator(validateTimerConfig);
