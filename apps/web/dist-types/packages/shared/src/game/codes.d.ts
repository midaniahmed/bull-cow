export declare const ROOM_CODE_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export declare const ROOM_CODE_LENGTH = 6;
export declare function isValidRoomCode(value: string): boolean;
export declare function generateRoomCode(getRandomBytes: (n: number) => Uint8Array): string;
//# sourceMappingURL=codes.d.ts.map