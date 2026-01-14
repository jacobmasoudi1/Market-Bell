import { useCallback, useEffect, useRef } from "react";

type Listener = () => void;

const listeners = new Set<Listener>();

export function useWatchlistSync() {
  const notify = useCallback(() => {
    listeners.forEach((l) => l());
  }, []);

  const subscribe = useCallback((fn: Listener) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);

  return { notify, subscribe };
}
