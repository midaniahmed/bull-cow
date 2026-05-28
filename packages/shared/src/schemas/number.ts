import { z } from 'zod';
import type { NumberRules } from '../game/rules.js';
import { validateNumber } from '../game/validate.js';

export function makeNumberSchema(rules: NumberRules) {
  return z.string().superRefine((val, ctx) => {
    const r = validateNumber(val, rules);
    if (!r.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: r.message,
        params: { errorCode: r.code },
      });
    }
  });
}
