import { useCallback, useState } from 'react';

export function useClipboard() {
  const [lastCopied, setLastCopied] = useState<{ text: string; at: number } | null>(null);
  const copy = useCallback(async (text: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        const t = document.createElement('textarea');
        t.value = text;
        t.style.position = 'absolute';
        t.style.left = '-9999px';
        document.body.appendChild(t);
        t.select();
        document.execCommand('copy');
        document.body.removeChild(t);
      }
      setLastCopied({ text, at: Date.now() });
      return true;
    } catch {
      return false;
    }
  }, []);
  return { copy, lastCopied };
}
