import { z } from 'zod';
import type { AckResult } from '../errors.js';
import type { RoomStateView } from '../views.js';
export declare const C2S_EVENTS: {
    readonly ROOM_LEAVE: "room:leave";
    readonly ROOM_KICK_JOINER: "room:kick_joiner";
    readonly ROOM_TOGGLE_READY: "room:toggle_ready";
    readonly ROOM_RECLAIM_TAB: "room:reclaim_tab";
    readonly SECRET_SUBMIT: "secret:submit";
    readonly RPS_PICK: "rps:pick";
    readonly GUESS_SUBMIT: "guess:submit";
    readonly FORFEIT: "forfeit";
    readonly EMOTE_SEND: "emote:send";
    readonly MUTE_TOGGLE: "mute:toggle";
    readonly REMATCH_OFFER: "rematch:offer";
    readonly REMATCH_RESPOND: "rematch:respond";
    readonly STATE_REQUEST: "state:request";
};
export type C2SEventName = (typeof C2S_EVENTS)[keyof typeof C2S_EVENTS];
export declare const NonceOnlySchema: z.ZodObject<{
    nonce: z.ZodString;
}, "strip", z.ZodTypeAny, {
    nonce: string;
}, {
    nonce: string;
}>;
export declare const ToggleReadySchema: z.ZodObject<{
    nonce: z.ZodString;
    ready: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    nonce: string;
    ready: boolean;
}, {
    nonce: string;
    ready: boolean;
}>;
export declare const SecretSubmitSchema: z.ZodObject<{
    nonce: z.ZodString;
    value: z.ZodString;
}, "strip", z.ZodTypeAny, {
    value: string;
    nonce: string;
}, {
    value: string;
    nonce: string;
}>;
export declare const RPSPickPayloadSchema: z.ZodObject<{
    nonce: z.ZodString;
    pick: z.ZodEnum<["rock", "paper", "scissors"]>;
}, "strip", z.ZodTypeAny, {
    nonce: string;
    pick: "rock" | "paper" | "scissors";
}, {
    nonce: string;
    pick: "rock" | "paper" | "scissors";
}>;
export declare const GuessSubmitSchema: z.ZodObject<{
    nonce: z.ZodString;
    value: z.ZodString;
}, "strip", z.ZodTypeAny, {
    value: string;
    nonce: string;
}, {
    value: string;
    nonce: string;
}>;
export declare const EmoteSendSchema: z.ZodObject<{
    nonce: z.ZodString;
    code: z.ZodEnum<["gg", "nice", "thinking", "wow", "oops", "well_played"]>;
}, "strip", z.ZodTypeAny, {
    code: "gg" | "nice" | "thinking" | "wow" | "oops" | "well_played";
    nonce: string;
}, {
    code: "gg" | "nice" | "thinking" | "wow" | "oops" | "well_played";
    nonce: string;
}>;
export declare const MuteToggleSchema: z.ZodObject<{
    nonce: z.ZodString;
    muted: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    nonce: string;
    muted: boolean;
}, {
    nonce: string;
    muted: boolean;
}>;
export declare const RematchRespondSchema: z.ZodObject<{
    nonce: z.ZodString;
    accept: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    nonce: string;
    accept: boolean;
}, {
    nonce: string;
    accept: boolean;
}>;
export type NonceOnly = z.infer<typeof NonceOnlySchema>;
export type ToggleReady = z.infer<typeof ToggleReadySchema>;
export type SecretSubmit = z.infer<typeof SecretSubmitSchema>;
export type RPSPickPayload = z.infer<typeof RPSPickPayloadSchema>;
export type GuessSubmit = z.infer<typeof GuessSubmitSchema>;
export type EmoteSend = z.infer<typeof EmoteSendSchema>;
export type MuteToggle = z.infer<typeof MuteToggleSchema>;
export type RematchRespond = z.infer<typeof RematchRespondSchema>;
export type ClientToServerEvents = {
    'room:leave': (p: NonceOnly, ack: (r: AckResult) => void) => void;
    'room:kick_joiner': (p: NonceOnly, ack: (r: AckResult) => void) => void;
    'room:toggle_ready': (p: ToggleReady, ack: (r: AckResult<{
        ready: boolean;
    }>) => void) => void;
    'room:reclaim_tab': (p: NonceOnly, ack: (r: AckResult) => void) => void;
    'secret:submit': (p: SecretSubmit, ack: (r: AckResult) => void) => void;
    'rps:pick': (p: RPSPickPayload, ack: (r: AckResult) => void) => void;
    'guess:submit': (p: GuessSubmit, ack: (r: AckResult) => void) => void;
    forfeit: (p: NonceOnly, ack: (r: AckResult) => void) => void;
    'emote:send': (p: EmoteSend, ack: (r: AckResult) => void) => void;
    'mute:toggle': (p: MuteToggle, ack: (r: AckResult) => void) => void;
    'rematch:offer': (p: NonceOnly, ack: (r: AckResult) => void) => void;
    'rematch:respond': (p: RematchRespond, ack: (r: AckResult) => void) => void;
    'state:request': (p: NonceOnly, ack: (r: AckResult<{
        state: RoomStateView;
    }>) => void) => void;
};
//# sourceMappingURL=client-to-server.d.ts.map