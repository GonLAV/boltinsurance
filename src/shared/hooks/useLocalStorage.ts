import { useState } from 'react';

export function useLocalStorage<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const val = localStorage.getItem(key);
      return val ? (JSON.parse(val) as T) : initial;
    } catch {
      return initial;
    }
  });

  const set = (v: T) => {
    setState(v);
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  };

  return [state, set] as const;
}
