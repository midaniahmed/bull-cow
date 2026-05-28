import { useState } from 'react';
import {
  DEFAULT_RULES,
  isLengthFeasible,
  type RoomSettings,
} from '@bc/shared';
import { Button } from '../primitives/Button.js';
import { Card } from '../primitives/Card.js';
import clsx from 'clsx';

type Props = {
  busy?: boolean;
  onSubmit: (settings: RoomSettings) => void;
};

function Switch({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-3 w-full text-left py-2"
    >
      <div>
        <div>{label}</div>
        {hint ? <div className="text-xs text-muted">{hint}</div> : null}
      </div>
      <span
        className={clsx(
          'inline-block w-11 h-7 rounded-full relative transition-colors',
          checked ? 'bg-gradient-to-r from-accent to-accent2 shadow-glow' : 'bg-white/10'
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5'
          )}
        />
      </span>
    </button>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:flex sm:flex-row gap-1 border border-white/10 bg-white/[0.03] p-1 rounded-xl">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={clsx(
            'flex-1 h-10 rounded-lg text-sm font-medium transition-all',
            value === o.value ? 'bg-gradient-to-r from-accent to-accent2 text-bg shadow-glow' : 'bg-transparent text-muted'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsForm({ busy, onSubmit }: Props) {
  const [length, setLength] = useState(DEFAULT_RULES.length);
  const [allowDuplicateDigits, setDup] = useState(DEFAULT_RULES.allowDuplicateDigits);
  const [allowLeadingZero, setLZ] = useState(DEFAULT_RULES.allowLeadingZero);
  const [turnSystem, setTS] = useState<'alternating' | 'simultaneous'>('alternating');
  const [firstTurn, setFT] = useState<'rps' | 'random' | 'creator' | 'joiner'>('rps');
  const [timeLimit, setTL] = useState<10 | 20 | 30 | 60 | null>(60);
  const [fogMode, setFog] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const rules = { length, allowDuplicateDigits, allowLeadingZero };
  const feasible = isLengthFeasible(rules);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h3 className="font-semibold mb-2">Number rules</h3>
        <div className="flex items-center justify-between mb-3">
          <span>Length</span>
          <div className="flex items-center gap-2">
            <Button size="sm" tone="secondary" onClick={() => setLength((l) => Math.max(3, l - 1))}>
              –
            </Button>
            <span className="w-6 text-center font-mono">{length}</span>
            <Button size="sm" tone="secondary" onClick={() => setLength((l) => Math.min(10, l + 1))}>
              +
            </Button>
          </div>
        </div>
        <Switch
          checked={allowDuplicateDigits}
          onChange={setDup}
          label="Allow duplicate digits"
          hint="Same digit can appear multiple times in the secret."
        />
        <Switch
          checked={allowLeadingZero}
          onChange={setLZ}
          label="Allow leading zero"
          hint="Secret can start with 0."
        />
        {!feasible ? (
          <div className="text-danger text-xs mt-2">
            Length too long for current rules — max {allowLeadingZero ? 10 : 9} when digits are unique.
          </div>
        ) : null}
      </Card>

      <Card>
        <h3 className="font-semibold mb-2">Match rules</h3>
        <div className="text-sm text-muted mb-1">Turn system</div>
        <Segmented
          value={turnSystem}
          onChange={setTS}
          options={[
            { value: 'alternating', label: 'Alternating' },
            { value: 'simultaneous', label: 'Simultaneous' },
          ]}
        />
        <div className="text-sm text-muted mb-1 mt-3">First turn</div>
        <Segmented
          value={firstTurn}
          onChange={setFT}
          options={[
            { value: 'rps', label: 'RPS' },
            { value: 'random', label: 'Random' },
            { value: 'creator', label: 'Creator' },
            { value: 'joiner', label: 'Joiner' },
          ]}
        />
        <div className="text-sm text-muted mb-1 mt-3">Turn time</div>
        <div className="grid grid-cols-5 gap-1 border border-white/10 bg-white/[0.03] p-1 rounded-xl">
          {[10, 20, 30, 60, null].map((t) => (
            <button
              key={String(t)}
              type="button"
              onClick={() => setTL(t as 10 | 20 | 30 | 60 | null)}
              className={clsx(
                'h-10 rounded-lg text-sm font-medium transition-all',
                timeLimit === t ? 'bg-gradient-to-r from-accent to-accent2 text-bg shadow-glow' : 'text-muted'
              )}
            >
              {t == null ? 'None' : `${t}s`}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <button
          type="button"
          className="font-semibold w-full text-left"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          Advanced {showAdvanced ? '▾' : '▸'}
        </button>
        {showAdvanced ? (
          <div className="mt-2">
            <Switch
              checked={fogMode}
              onChange={setFog}
              label="Fog mode"
              hint="Hide opponent's guesses from your board."
            />
          </div>
        ) : null}
      </Card>

      <Button
        size="lg"
        loading={busy}
        disabled={!feasible || busy}
        onClick={() =>
          onSubmit({
            number: { length, allowDuplicateDigits, allowLeadingZero },
            match: { turnSystem, firstTurn, turnTimeLimitSeconds: timeLimit },
            advanced: { fogMode },
          })
        }
      >
        Create Room
      </Button>
    </div>
  );
}
