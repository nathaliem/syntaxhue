import { parseTheme } from "./schema";
import type { ThemeState } from "./theme";

/** A theme kept in the library. */
export interface SavedTheme {
  id: string;
  theme: ThemeState;
  /** Milliseconds since the epoch, for "edited 2 h ago" and for sorting. */
  savedAt: number;
}

/**
 * Where saved themes live. The app only talks to this interface, so the browser database can be
 * swapped (or replaced by memory when the browser blocks storage) without touching the UI.
 */
export interface LibraryStore {
  /** False when themes will be lost on reload (memory fallback). */
  readonly persistent: boolean;
  /** Newest first. Records that can't be read any more (corrupt, or from a newer app) are left out. */
  list(): Promise<SavedTheme[]>;
  put(item: SavedTheme): Promise<void>;
  remove(id: string): Promise<void>;
}

export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Reads one stored record defensively; null when it isn't a usable theme. */
function readRecord(raw: unknown): SavedTheme | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const theme = parseTheme(r.theme);
  if (typeof r.id !== "string" || !theme) return null;
  return { id: r.id, theme, savedAt: typeof r.savedAt === "number" && Number.isFinite(r.savedAt) ? r.savedAt : 0 };
}

const newestFirst = (items: SavedTheme[]) => items.sort((a, b) => b.savedAt - a.savedAt);

export function memoryStore(): LibraryStore {
  const items = new Map<string, SavedTheme>();
  return {
    persistent: false,
    list: async () => newestFirst([...items.values()]),
    put: async (item) => void items.set(item.id, item),
    remove: async (id) => void items.delete(id),
  };
}

const DB_VERSION = 1;
const STORE = "themes";

const done = <T>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
  });

const finished = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });

/** Opens (and if needed creates) the browser database. Rejects when the browser won't allow it. */
export function indexedDbStore(factory: IDBFactory, name = "syntaxhue"): Promise<LibraryStore> {
  return new Promise((resolve, reject) => {
    let req: IDBOpenDBRequest;
    try {
      req = factory.open(name, DB_VERSION);
    } catch (e) {
      return reject(e);
    }
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onerror = () => reject(req.error ?? new Error("Could not open the database"));
    req.onblocked = () => reject(new Error("The database is blocked by another tab"));
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => db.close();
      const tx = (mode: IDBTransactionMode) => db.transaction(STORE, mode);
      resolve({
        persistent: true,
        async list() {
          const all = await done(tx("readonly").objectStore(STORE).getAll());
          return newestFirst(all.map(readRecord).filter((r): r is SavedTheme => r !== null));
        },
        async put(item) {
          const t = tx("readwrite");
          t.objectStore(STORE).put(item);
          await finished(t);
        },
        async remove(id) {
          const t = tx("readwrite");
          t.objectStore(STORE).delete(id);
          await finished(t);
        },
      });
    };
  });
}

/** The browser database when it works, otherwise memory (and `persistent` says which). */
export async function openLibrary(factory: IDBFactory | undefined = globalThis.indexedDB): Promise<LibraryStore> {
  if (!factory) return memoryStore();
  try {
    return await indexedDbStore(factory);
  } catch {
    return memoryStore();
  }
}
