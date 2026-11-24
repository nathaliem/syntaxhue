import { useCallback, useRef, useState } from "react";
import { newId, openLibrary, type LibraryStore, type SavedTheme } from "../engine/library";
import type { ThemeState } from "../engine/theme";

export interface Library {
  items: SavedTheme[];
  /** False when the browser blocks storage and themes only last until the tab closes. */
  persistent: boolean;
  loaded: boolean;
  error: string | null;
  /** Reads the list from storage (opens the database the first time). */
  refresh(): Promise<void>;
  /** Saves a theme; the same colors saved twice only refresh the existing entry. Resolves to false on failure. */
  save(theme: ThemeState): Promise<boolean>;
}

const same = (a: ThemeState, b: ThemeState) => JSON.stringify(a) === JSON.stringify(b);

/** The saved-themes library. The database is only opened when it is first needed. */
export function useLibrary(provided?: LibraryStore): Library {
  const opened = useRef<Promise<LibraryStore> | null>(null);
  const providedStore = useRef(provided);
  const [state, setState] = useState({ items: [] as SavedTheme[], persistent: true, loaded: false });
  const [error, setError] = useState<string | null>(null);

  const store = useCallback(
    () => (opened.current ??= providedStore.current ? Promise.resolve(providedStore.current) : openLibrary()),
    [],
  );

  const refresh = useCallback(async () => {
    try {
      const s = await store();
      setState({ items: await s.list(), persistent: s.persistent, loaded: true });
      setError(null);
    } catch {
      setState((p) => ({ ...p, loaded: true }));
      setError("Couldn't read your saved themes.");
    }
  }, [store]);

  const save = useCallback(
    async (theme: ThemeState) => {
      try {
        const s = await store();
        const existing = (await s.list()).find((i) => same(i.theme, theme));
        await s.put({ id: existing?.id ?? newId(), theme, savedAt: Date.now() });
        await refresh();
        return true;
      } catch {
        setError("Couldn't save this theme. Your browser may be out of space or blocking storage.");
        return false;
      }
    },
    [store, refresh],
  );

  return { ...state, error, refresh, save };
}
