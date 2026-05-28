import { type NumberRules, type AckResult } from '@bc/shared';
type Props = {
    rules: NumberRules;
    onSubmit: (value: string) => Promise<AckResult>;
    submitLabel: string;
    disabled?: boolean;
    autoFocus?: boolean;
};
export declare function DigitInput({ rules, onSubmit, submitLabel, disabled, autoFocus }: Props): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=DigitInput.d.ts.map