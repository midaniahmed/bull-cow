import { type ButtonHTMLAttributes } from 'react';
type Size = 'lg' | 'md' | 'sm';
type Tone = 'primary' | 'secondary' | 'danger' | 'ghost';
export declare const Button: import("react").ForwardRefExoticComponent<ButtonHTMLAttributes<HTMLButtonElement> & {
    size?: Size;
    tone?: Tone;
    loading?: boolean;
} & import("react").RefAttributes<HTMLButtonElement>>;
export {};
//# sourceMappingURL=Button.d.ts.map