import { z } from 'zod';
export declare const EMOTE_CODES: readonly ["gg", "nice", "thinking", "wow", "oops", "well_played"];
export type EmoteCode = (typeof EMOTE_CODES)[number];
export declare const EmoteCodeSchema: z.ZodEnum<["gg", "nice", "thinking", "wow", "oops", "well_played"]>;
//# sourceMappingURL=emote.d.ts.map