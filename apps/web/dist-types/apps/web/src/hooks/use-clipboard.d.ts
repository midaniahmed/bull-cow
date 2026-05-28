export declare function useClipboard(): {
    copy: (text: string) => Promise<boolean>;
    lastCopied: {
        text: string;
        at: number;
    } | null;
};
//# sourceMappingURL=use-clipboard.d.ts.map