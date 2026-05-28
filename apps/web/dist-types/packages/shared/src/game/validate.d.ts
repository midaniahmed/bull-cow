import type { NumberRules } from './rules.js';
export type ValidationOk = {
    ok: true;
};
export type ValidationErr = {
    ok: false;
    code: 'length' | 'charset' | 'duplicate_digits' | 'leading_zero';
    message: string;
};
export declare function validateNumber(value: string, rules: NumberRules): ValidationOk | ValidationErr;
//# sourceMappingURL=validate.d.ts.map