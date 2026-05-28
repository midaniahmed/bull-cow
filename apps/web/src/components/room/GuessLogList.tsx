import type { GuessLogEntry, SessionToken } from '@bc/shared';

export function GuessLogList({
  entries,
  filterToken,
}: {
  entries: GuessLogEntry[];
  filterToken?: SessionToken;
}) {
  const list = filterToken ? entries.filter((e) => e.playerToken === filterToken) : entries;
  if (list.length === 0) {
    return <div className="text-sm text-muted text-center py-3">No guesses yet</div>;
  }
  return (
    <ul className="flex flex-col gap-1">
      {list.map((e, i) => (
        <li
          key={`${e.playerToken}:${e.turnIndex}:${i}`}
          className="flex items-center justify-between px-3 py-2 bg-bg rounded-md font-mono text-sm"
        >
          <span className="text-muted">#{(e.roundIndex ?? e.turnIndex) + 1}</span>
          <span className="text-lg">{e.value}</span>
          <span>
            <span className="text-success">{e.bulls}🐂</span>{' '}
            <span className="text-warn">{e.cows}🐄</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
