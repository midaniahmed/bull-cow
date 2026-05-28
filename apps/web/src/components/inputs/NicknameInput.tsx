import { useState } from 'react';
import { NicknameSchema } from '@bc/shared';
import { Button } from '../primitives/Button.js';

type Props = {
  initial?: string;
  onSubmit: (nickname: string) => Promise<void> | void;
  submitLabel?: string;
};

export function NicknameInput({ initial = '', onSubmit, submitLabel = 'Continue' }: Props) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const parse = NicknameSchema.safeParse(v.trim());
  const canSubmit = parse.success && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setErr(null);
    try {
      await onSubmit(parse.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm text-muted">Nickname</label>
      <input
        type="text"
        inputMode="text"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        maxLength={20}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="2–20 characters"
        className="bg-panel border border-panel2 rounded-lg px-3 h-11 text-base text-ink"
      />
      <div className="h-5 text-xs text-danger">
        {v && !parse.success ? parse.error.errors[0]?.message : err}
      </div>
      <Button size="lg" onClick={submit} disabled={!canSubmit} loading={busy}>
        {submitLabel}
      </Button>
    </div>
  );
}
