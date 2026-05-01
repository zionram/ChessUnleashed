export type ExperienceComplianceCategoryId =
  | 'rules'
  | 'timer'
  | 'board'
  | 'pieces'
  | 'uiAppearance'
  | 'audio'
  | 'chat'
  | 'bot';

export type ExperienceComplianceMode = 'force' | 'allowOverride' | 'ignore';

export interface ExperienceComplianceRule {
  categoryId: ExperienceComplianceCategoryId;
  mode: ExperienceComplianceMode;
  subkeys?: string[];
}

export type ExperienceCompliancePolicy = ExperienceComplianceRule[];

export interface LegacyExperienceComplianceSettings {
  enforceSharedExp: boolean;
  allowPersonalPieces: boolean;
  compliancePolicy?: ExperienceCompliancePolicy | null;
}

export const EXPERIENCE_COMPLIANCE_CATEGORIES: ExperienceComplianceCategoryId[] = [
  'rules',
  'timer',
  'board',
  'pieces',
  'uiAppearance',
  'audio',
  'chat',
  'bot'
];

const makeRule = (
  categoryId: ExperienceComplianceCategoryId,
  mode: ExperienceComplianceMode,
  subkeys?: string[]
): ExperienceComplianceRule => ({
  categoryId,
  mode,
  ...(subkeys ? { subkeys } : {})
});

export const deriveLegacyExperienceCompliancePolicy = ({
  enforceSharedExp,
  allowPersonalPieces
}: LegacyExperienceComplianceSettings): ExperienceCompliancePolicy => {
  if (!enforceSharedExp) {
    return EXPERIENCE_COMPLIANCE_CATEGORIES.map(categoryId => makeRule(categoryId, 'ignore'));
  }

  return [
    makeRule('rules', 'force', ['trainingWheels']),
    makeRule('timer', 'ignore'),
    makeRule('board', 'force'),
    makeRule('pieces', allowPersonalPieces ? 'allowOverride' : 'force'),
    makeRule('uiAppearance', 'ignore'),
    makeRule('audio', 'ignore'),
    makeRule('chat', 'ignore'),
    makeRule('bot', 'ignore')
  ];
};

export const deriveEffectiveExperienceCompliancePolicy = (
  settings: LegacyExperienceComplianceSettings
): ExperienceCompliancePolicy => {
  const legacyPolicy = deriveLegacyExperienceCompliancePolicy(settings);
  if (!settings.compliancePolicy?.length) return legacyPolicy;

  const policyByCategory = new Map<ExperienceComplianceCategoryId, ExperienceComplianceRule>();
  legacyPolicy.forEach(rule => policyByCategory.set(rule.categoryId, rule));
  settings.compliancePolicy.forEach(rule => policyByCategory.set(rule.categoryId, rule));
  return EXPERIENCE_COMPLIANCE_CATEGORIES.map(categoryId => policyByCategory.get(categoryId) ?? makeRule(categoryId, 'ignore'));
};

export const getComplianceMode = (
  policy: ExperienceCompliancePolicy,
  categoryId: ExperienceComplianceCategoryId
): ExperienceComplianceMode => (
  policy.find(rule => rule.categoryId === categoryId)?.mode ?? 'ignore'
);
