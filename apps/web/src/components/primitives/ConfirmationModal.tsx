import type { ReactNode } from 'react';
import { Modal } from './Modal.js';
import { Button } from './Button.js';

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

export function ConfirmationModal({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      {body ? <div className="mb-4 text-muted">{body}</div> : null}
      <div className="flex gap-2 justify-end">
        <Button size="md" tone="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button size="md" tone={destructive ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
