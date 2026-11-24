import { useCallback, useEffect, useRef, useState } from "react";
import { newId, openLibrary, themesEqual, type LibraryStore, type SavedTheme } from "../engine/library";
import type { ThemeState } from "../engine/theme";

const LINK_KEY = "hueprint:library-link";

function readLink(): string | null {
  try {
    return localStorage.getItem(LINK_KEY);
  } catch {
    return null;
  }
}

function writeLink(id: string | null) {
  try {
    if (id) localStorage.setItem(LINK_KEY, id);
    else localStorage.removeItem(LINK_KEY);
  } catch {
    /* storage blocked: the link just won't survive a reload */
  }
}

export interface Library {
  items: SavedTheme[];
  /** False when the browser blocks storage and themes only last until the tab closes. */
  persistent: boolean;
  loaded: boolean;
  error: string | null;
  /** The library entry the theme being edited came from or was last saved to; null for a theme not in the library. */
  linked: SavedTheme | null;
  /** Reads the list from storage (opens the database the first time). */
  refresh(): Promise<void>;
  /**
   * Saves a theme and makes it the linked one. "update" replaces the linked entry (and saves as new when there is
   * none); "new" always adds an entry, unless an entry with the same work exists already. Resolves to the saved
   * entry, or null on failure.
   */
  save(theme: ThemeState, how?: "update" | "new"): Promise<SavedTheme | null>;
  /** Marks a saved theme as the one being edited. */
  open(item: SavedTheme): void;
  /** The theme being edited is no longer a copy of a library entry (imported, or a shared link kept). */
  unlink(): void;
}

/** The saved-themes library. The database is only opened when it is first needed. */
export function useLibrary(provided?: LibraryStore): Library {
  const opened = useRef<Promise<LibraryStore> | null>(null);
  const providedStore = useRef(provided);
  const [state, setState] = useState({ items: [] as SavedTheme[], persistent: true, loaded: false });
  const [linkedId, setLinkedId] = useState<string | null>(readLink);
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

  // Someone who works from the library gets the "unsaved changes" marker right after a reload, so the list is read
  // at startup, but only when a theme is linked to it.
  useEffect(() => {
    if (!readLink()) return;
    let live = true;
    store()
      .then(async (s) => ({ items: await s.list(), persistent: s.persistent, loaded: true }))
      .then((next) => live && setState(next))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [store]);

  const link = useCallback((id: string | null) => {
    setLinkedId(id);
    writeLink(id);
  }, []);

  const save = useCallback(
    async (theme: ThemeState, how: "update" | "new" = "update") => {
      try {
        const s = await store();
        const items = await s.list();
        const target =
          how === "update" && linkedId && items.some((i) => i.id === linkedId)
            ? linkedId
            : (items.find((i) => themesEqual(i.theme, theme))?.id ?? newId());
        const item: SavedTheme = { id: target, theme, savedAt: Date.now() };
        await s.put(item);
        link(item.id);
        await refresh();
        return item;
      } catch {
        setError("Couldn't save this theme. Your browser may be out of space or blocking storage.");
        return null;
      }
    },
    [store, refresh, linkedId, link],
  );

  const linked = (linkedId && state.items.find((i) => i.id === linkedId)) || null;

  return {
    ...state,
    error,
    linked,
    refresh,
    save,
    open: useCallback((item: SavedTheme) => link(item.id), [link]),
    unlink: useCallback(() => link(null), [link]),
  };
}
