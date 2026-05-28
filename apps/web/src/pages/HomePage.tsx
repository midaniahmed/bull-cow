import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/primitives/Button.js';
import { Card } from '../components/primitives/Card.js';
import { Modal } from '../components/primitives/Modal.js';
import { NicknameInput } from '../components/inputs/NicknameInput.js';
import { useSessionStore } from '../stores/session.store.js';

export function HomePage() {
  const nickname = useSessionStore((s) => s.nickname);
  const setNickname = useSessionStore((s) => s.setNickname);
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex flex-col gap-4 max-w-md mx-auto pt-6">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted">Playing as</div>
            <div className="text-lg font-semibold">{nickname}</div>
          </div>
          <Button size="sm" tone="secondary" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
      </Card>
      <Link to="/create">
        <Button size="lg" className="w-full">
          Create Room
        </Button>
      </Link>
      <Link to="/join">
        <Button size="lg" tone="secondary" className="w-full">
          Join Room
        </Button>
      </Link>
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit nickname">
        <NicknameInput
          initial={nickname ?? ''}
          onSubmit={async (nn) => {
            await setNickname(nn);
            setEditing(false);
          }}
          submitLabel="Save"
        />
      </Modal>
    </div>
  );
}
