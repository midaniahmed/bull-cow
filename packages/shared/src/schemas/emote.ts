import { z } from 'zod';

export const EMOTE_CODES = ['gg', 'nice', 'thinking', 'wow', 'oops', 'well_played'] as const;
export type EmoteCode = (typeof EMOTE_CODES)[number];

export const EmoteCodeSchema = z.enum(EMOTE_CODES);
