import { useRef, useState } from 'react';
import { validateNumber, type NumberRules, type AckResult } from '@bc/shared';
import { DigitCells } from './DigitCells.js';
import { Button } from '../primitives/Button.js';

type Props = {
  rules: NumberRules;
  onSubmit: (value: string) => Promise<AckResult>;
  submitLabel: string;
  disabled?: boolean;
  autoFocus?: boolean;
};

export function DigitInput({ rules, onSubmit, submitLabel, disabled, autoFocus }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const validation = validateNumber(value, rules);
  const canSubmit = !busy && !disabled && validation.ok;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const stripped = e.target.value.replace(/\D/g, '').slice(0, rules.length);
    setValue(stripped);
    setServerError(null);
  };

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setServerError(null);
    const r = await onSubmit(value);
    setBusy(false);
    if (!r.ok) setServerError(r.message ?? 'Submission failed');
    else setValue('');
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void submit();
  };

  return (
    <div className="flex flex-col gap-3 items-center">
      <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-muted">
        <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5">{rules.length} digits</span>
        {!rules.allowDuplicateDigits && (
          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5">unique</span>
        )}
        {!rules.allowLeadingZero && (
          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5">no leading 0</span>
        )}
      </div>
      <div className="relative" onClick={() => inputRef.current?.focus()}>
        <DigitCells value={value} length={rules.length} />
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={rules.length}
          enterKeyHint="send"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKey}
          autoFocus={autoFocus}
          disabled={disabled || busy}
          className="absolute inset-0 opacity-0"
        />
      </div>
      <div className="h-5 text-xs text-danger">
        {!validation.ok && value.length === rules.length ? validation.message : serverError}
      </div>
      <Button size="lg" onClick={submit} disabled={!canSubmit} loading={busy} className="w-full max-w-xs">
        {submitLabel}
      </Button>
    </div>
  );
}
