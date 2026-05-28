import { useState, type ReactNode } from 'react';
import { useSessionStore } from '../../stores/session.store.js';
import { Modal } from '../primitives/Modal.js';
import { NicknameInput } from '../inputs/NicknameInput.js';

export function RequireSession({ children }: { children: ReactNode }) {
  const status = useSessionStore((s) => s.status);
  const setNickname = useSessionStore((s) => s.setNickname);
  const [submitting, setSubmitting] = useState(false);

  return (
    <>
      {status === 'ready' ? children : null}
      <Modal open={status !== 'ready'} title="Choose a nickname">
        <NicknameInput
          onSubmit={async (nn) => {
            setSubmitting(true);
            try {
              await setNickname(nn);
            } finally {
              setSubmitting(false);
            }
          }}
          submitLabel={submitting ? 'Saving…' : 'Continue'}
        />
      </Modal>
    </>
  );
}
