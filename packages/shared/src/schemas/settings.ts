import { z } from 'zod';
import { isLengthFeasible } from '../game/rules.js';

export const NumberRulesSchema = z
  .object({
    length: z.number().int().min(3).max(10),
    allowDuplicateDigits: z.boolean(),
    allowLeadingZero: z.boolean(),
  })
  .refine(isLengthFeasible, {
    message: 'Length not feasible under chosen rules',
    path: ['length'],
  });

export const TurnSystemSchema = z.enum(['alternating', 'simultaneous']);
export const FirstTurnRuleSchema = z.enum(['rps', 'random', 'creator', 'joiner']);

export const MatchRulesSchema = z.object({
  turnSystem: TurnSystemSchema,
  firstTurn: FirstTurnRuleSchema,
  turnTimeLimitSeconds: z.union([
    z.literal(10),
    z.literal(20),
    z.literal(30),
    z.literal(60),
    z.null(),
  ]),
});

export const AdvancedRulesSchema = z.object({
  fogMode: z.boolean(),
});

export const RoomSettingsSchema = z.object({
  number: NumberRulesSchema,
  match: MatchRulesSchema,
  advanced: AdvancedRulesSchema,
});

export type NumberRulesInput = z.input<typeof NumberRulesSchema>;
export type RoomSettings = z.output<typeof RoomSettingsSchema>;
