import { useRef, useState } from 'react';
import { ROOM_CODE_CHARSET, ROOM_CODE_LENGTH, isValidRoomCode } from '@bc/shared';
import { DigitCells } from './DigitCells.js';
import { Button } from '../primitives/Button.js';

const allowedRegex = new RegExp(`[^${ROOM_CODE_CHARSET}]`, 'g');

export function RoomCodeInput({ onSubmit }: { onSubmit: (code: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [v, setV] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value.toUpperCase().replace(allowedRegex, '').slice(0, ROOM_CODE_LENGTH);
    setV(next);
  };

  const canSubmit = isValidRoomCode(v);
  const submit = () => canSubmit && onSubmit(v);

  return (
    <div className="flex flex-col gap-3 items-center">
      <div className="relative" onClick={() => ref.current?.focus()}>
        <DigitCells value={v} length={ROOM_CODE_LENGTH} charset="alnum" />
        <input
          ref={ref}
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={ROOM_CODE_LENGTH}
          value={v}
          onChange={handleChange}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          className="absolute inset-0 opacity-0"
        />
      </div>
      <Button size="lg" disabled={!canSubmit} onClick={submit} className="w-full max-w-xs">
        Join
      </Button>
    </div>
  );
}
