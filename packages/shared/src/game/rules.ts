export type NumberRules = {
  length: number;
  allowDuplicateDigits: boolean;
  allowLeadingZero: boolean;
};

export const DEFAULT_RULES: NumberRules = {
  length: 4,
  allowDuplicateDigits: false,
  allowLeadingZero: false,
};

export function digitPoolSize(
  rules: Pick<NumberRules, 'allowDuplicateDigits' | 'allowLeadingZero'>
): number {
  if (rules.allowDuplicateDigits) return 10;
  return rules.allowLeadingZero ? 10 : 9;
}

export function isLengthFeasible(rules: NumberRules): boolean {
  if (rules.length < 3 || rules.length > 10) return false;
  if (rules.allowDuplicateDigits) return true;
  return rules.length <= digitPoolSize(rules);
}
