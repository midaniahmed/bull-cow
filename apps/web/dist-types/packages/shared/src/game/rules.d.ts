export type NumberRules = {
    length: number;
    allowDuplicateDigits: boolean;
    allowLeadingZero: boolean;
};
export declare const DEFAULT_RULES: NumberRules;
export declare function digitPoolSize(rules: Pick<NumberRules, 'allowDuplicateDigits' | 'allowLeadingZero'>): number;
export declare function isLengthFeasible(rules: NumberRules): boolean;
//# sourceMappingURL=rules.d.ts.map