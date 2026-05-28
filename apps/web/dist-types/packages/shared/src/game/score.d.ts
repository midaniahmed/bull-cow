export type ScoreResult = {
    bulls: number;
    cows: number;
};
export declare class InvalidArgument extends Error {
    readonly code: string;
    constructor(code: string);
}
export declare function scoreGuess(guess: string, secret: string): ScoreResult;
export declare function isAllBulls(result: ScoreResult, length: number): boolean;
//# sourceMappingURL=score.d.ts.map