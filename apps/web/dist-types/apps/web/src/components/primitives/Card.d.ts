import { type ReactNode } from 'react';
import { type MotionProps } from 'framer-motion';
type Props = {
    className?: string;
    children?: ReactNode;
    /** Set false to opt out of the entrance animation (e.g. inside a stagger parent). */
    animate?: boolean;
} & Omit<MotionProps, 'children'>;
export declare function Card({ className, children, animate, ...rest }: Props): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Card.d.ts.map