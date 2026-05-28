import type { NumberRules } from './rules.js';

export type ValidationOk = { ok: true };
export type ValidationErr = {
  ok: false;
  code: 'length' | 'charset' | 'duplicate_digits' | 'leading_zero';
  message: string;
};

export function validateNumber(
  value: string,
  rules: NumberRules
): ValidationOk | ValidationErr {
  if (value.length !== rules.length) {
    return { ok: false, code: 'length', message: `Must be ${rules.length} digits` };
  }
  if (!/^\d+$/.test(value)) {
    return { ok: false, code: 'charset', message: 'Digits only' };
  }
  if (!rules.allowLeadingZero && value[0] === '0') {
    return { ok: false, code: 'leading_zero', message: 'No leading zero' };
  }
  if (!rules.allowDuplicateDigits) {
    const seen = new Set<string>();
    for (const d of value) {
      if (seen.has(d)) {
        return { ok: false, code: 'duplicate_digits', message: 'No repeated digits' };
      }
      seen.add(d);
    }
  }
  return { ok: true };
}
