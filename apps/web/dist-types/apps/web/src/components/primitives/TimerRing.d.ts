type Props = {
    endsAt: string | number | null;
    paused?: boolean;
    size?: number;
    className?: string;
};
/**
 * Depleting timer ring. The full ring = the longest remaining time we've seen
 * for the current `endsAt` (re-armed whenever the deadline changes), so it
 * works without being told the turn's total duration.
 */
export declare function TimerRing({ endsAt, paused, size, className }: Props): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=TimerRing.d.ts.map