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
  /** Renames a saved entry (its edited time stays, so the list doesn't jump). False when the name is empty or it failed. */
  rename(id: string, name: string): Promise<boolean>;
  /** Adds a copy named "<name> copy" and resolves to it; it does not become the linked entry. */
  duplicate(id: string): Promise<SavedTheme | null>;
  /** Deletes an entry and resolves to it, so the caller can offer Undo. */
  remove(id: string): Promise<SavedTheme | null>;
  /** Puts back an entry removed by `remove`, with its old id and edited time. */
  restore(item: SavedTheme): Promise<boolean>;
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

  /** Runs a change on one stored entry, then re-reads the list. Resolves to what `change` returned, or null on failure. */
  const edit = useCallback(
    async <T>(failure: string, change: (s: LibraryStore) => Promise<T>): Promise<T | null> => {
      try {
        const result = await change(await store());
        await refresh();
        return result;
      } catch {
        setError(failure);
        return null;
      }
    },
    [store, refresh],
  );

  const rename = useCallback(
    async (id: string, name: string) => {
      const clean = name.trim();
      if (!clean) return false;
      const done = await edit("Couldn't rename this theme.", async (s) => {
        const item = (await s.list()).find((i) => i.id === id);
        if (!item) return false;
        await s.put({ ...item, theme: { ...item.theme, name: clean } });
        return true;
      });
      return done === true;
    },
    [edit],
  );

  const duplicate = useCallback(
    (id: string) =>
      edit("Couldn't duplicate this theme.", async (s) => {
        const item = (await s.list()).find((i) => i.id === id);
        if (!item) return null;
        const copy: SavedTheme = {
          id: newId(),
          theme: { ...item.theme, name: `${item.theme.name} copy` },
          savedAt: Date.now(),
        };
        await s.put(copy);
        return copy;
      }),
    [edit],
  );

  const remove = useCallback(
    (id: string) =>
      edit("Couldn't delete this theme.", async (s) => {
        const item = (await s.list()).find((i) => i.id === id) ?? null;
        if (item) await s.remove(id);
        return item;
      }),
    [edit],
  );

  const restore = useCallback(
    async (item: SavedTheme) =>
      (await edit("Couldn't restore this theme.", async (s) => (await s.put(item), true))) === true,
    [edit],
  );

  const linked = (linkedId && state.items.find((i) => i.id === linkedId)) || null;

  return {
    ...state,
    error,
    linked,
    refresh,
    save,
    rename,
    duplicate,
    remove,
    restore,
    open: useCallback((item: SavedTheme) => link(item.id), [link]),
    unlink: useCallback(() => link(null), [link]),
  };
}
