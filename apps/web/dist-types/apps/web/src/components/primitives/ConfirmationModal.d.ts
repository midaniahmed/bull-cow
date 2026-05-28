import type { ReactNode } from 'react';
type Props = {
    open: boolean;
    title: string;
    body?: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};
export declare function ConfirmationModal({ open, title, body, confirmLabel, cancelLabel, destructive, onConfirm, onCancel, }: Props): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ConfirmationModal.d.ts.map