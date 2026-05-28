import type { ReactNode } from 'react';
type Props = {
    open: boolean;
    onClose?: () => void;
    children: ReactNode;
    title?: string;
};
export declare function Modal({ open, onClose, children, title }: Props): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Modal.d.ts.map