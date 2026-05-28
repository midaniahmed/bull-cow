import { z } from 'zod';
export declare const NumberRulesSchema: z.ZodEffects<z.ZodObject<{
    length: z.ZodNumber;
    allowDuplicateDigits: z.ZodBoolean;
    allowLeadingZero: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    allowDuplicateDigits: boolean;
    allowLeadingZero: boolean;
    length: number;
}, {
    allowDuplicateDigits: boolean;
    allowLeadingZero: boolean;
    length: number;
}>, {
    allowDuplicateDigits: boolean;
    allowLeadingZero: boolean;
    length: number;
}, {
    allowDuplicateDigits: boolean;
    allowLeadingZero: boolean;
    length: number;
}>;
export declare const TurnSystemSchema: z.ZodEnum<["alternating", "simultaneous"]>;
export declare const FirstTurnRuleSchema: z.ZodEnum<["rps", "random", "creator", "joiner"]>;
export declare const MatchRulesSchema: z.ZodObject<{
    turnSystem: z.ZodEnum<["alternating", "simultaneous"]>;
    firstTurn: z.ZodEnum<["rps", "random", "creator", "joiner"]>;
    turnTimeLimitSeconds: z.ZodUnion<[z.ZodLiteral<10>, z.ZodLiteral<20>, z.ZodLiteral<30>, z.ZodLiteral<60>, z.ZodNull]>;
}, "strip", z.ZodTypeAny, {
    turnSystem: "alternating" | "simultaneous";
    firstTurn: "rps" | "random" | "creator" | "joiner";
    turnTimeLimitSeconds: 20 | 10 | 30 | 60 | null;
}, {
    turnSystem: "alternating" | "simultaneous";
    firstTurn: "rps" | "random" | "creator" | "joiner";
    turnTimeLimitSeconds: 20 | 10 | 30 | 60 | null;
}>;
export declare const AdvancedRulesSchema: z.ZodObject<{
    fogMode: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    fogMode: boolean;
}, {
    fogMode: boolean;
}>;
export declare const RoomSettingsSchema: z.ZodObject<{
    number: z.ZodEffects<z.ZodObject<{
        length: z.ZodNumber;
        allowDuplicateDigits: z.ZodBoolean;
        allowLeadingZero: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        allowDuplicateDigits: boolean;
        allowLeadingZero: boolean;
        length: number;
    }, {
        allowDuplicateDigits: boolean;
        allowLeadingZero: boolean;
        length: number;
    }>, {
        allowDuplicateDigits: boolean;
        allowLeadingZero: boolean;
        length: number;
    }, {
        allowDuplicateDigits: boolean;
        allowLeadingZero: boolean;
        length: number;
    }>;
    match: z.ZodObject<{
        turnSystem: z.ZodEnum<["alternating", "simultaneous"]>;
        firstTurn: z.ZodEnum<["rps", "random", "creator", "joiner"]>;
        turnTimeLimitSeconds: z.ZodUnion<[z.ZodLiteral<10>, z.ZodLiteral<20>, z.ZodLiteral<30>, z.ZodLiteral<60>, z.ZodNull]>;
    }, "strip", z.ZodTypeAny, {
        turnSystem: "alternating" | "simultaneous";
        firstTurn: "rps" | "random" | "creator" | "joiner";
        turnTimeLimitSeconds: 20 | 10 | 30 | 60 | null;
    }, {
        turnSystem: "alternating" | "simultaneous";
        firstTurn: "rps" | "random" | "creator" | "joiner";
        turnTimeLimitSeconds: 20 | 10 | 30 | 60 | null;
    }>;
    advanced: z.ZodObject<{
        fogMode: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        fogMode: boolean;
    }, {
        fogMode: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    number: {
        allowDuplicateDigits: boolean;
        allowLeadingZero: boolean;
        length: number;
    };
    match: {
        turnSystem: "alternating" | "simultaneous";
        firstTurn: "rps" | "random" | "creator" | "joiner";
        turnTimeLimitSeconds: 20 | 10 | 30 | 60 | null;
    };
    advanced: {
        fogMode: boolean;
    };
}, {
    number: {
        allowDuplicateDigits: boolean;
        allowLeadingZero: boolean;
        length: number;
    };
    match: {
        turnSystem: "alternating" | "simultaneous";
        firstTurn: "rps" | "random" | "creator" | "joiner";
        turnTimeLimitSeconds: 20 | 10 | 30 | 60 | null;
    };
    advanced: {
        fogMode: boolean;
    };
}>;
export type NumberRulesInput = z.input<typeof NumberRulesSchema>;
export type RoomSettings = z.output<typeof RoomSettingsSchema>;
//# sourceMappingURL=settings.d.ts.map