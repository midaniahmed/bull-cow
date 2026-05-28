import { type ButtonHTMLAttributes } from 'react';
type Size = 'lg' | 'md' | 'sm';
type Tone = 'primary' | 'secondary' | 'danger' | 'ghost';
type NativeProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration' | 'onDrag' | 'onDragStart' | 'onDragEnd'>;
export declare const Button: import("react").ForwardRefExoticComponent<NativeProps & {
    size?: Size;
    tone?: Tone;
    loading?: boolean;
} & import("react").RefAttributes<HTMLButtonElement>>;
export {};
//# sourceMappingURL=Button.d.ts.map