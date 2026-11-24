import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { indexedDbStore, memoryStore, newId, openLibrary, type LibraryStore, type SavedTheme } from "./library";
import { generate } from "./theme";

const item = (seed: number, savedAt: number): SavedTheme => ({
  id: newId(),
  theme: { ...generate(seed, "dark"), name: `Theme ${seed}` },
  savedAt,
});

function behaves(name: string, make: () => Promise<LibraryStore>) {
  describe(name, () => {
    it("saves, lists newest first, replaces by id and removes", async () => {
      const store = await make();
      const a = item(1, 100);
      const b = item(2, 200);
      await store.put(a);
      await store.put(b);
      expect((await store.list()).map((x) => x.theme.name)).toEqual(["Theme 2", "Theme 1"]);

      await store.put({ ...a, savedAt: 300 });
      expect((await store.list()).map((x) => x.theme.name)).toEqual(["Theme 1", "Theme 2"]);

      await store.remove(a.id);
      expect((await store.list()).map((x) => x.id)).toEqual([b.id]);
    });

    it("hands back themes exactly as they were saved", async () => {
      const store = await make();
      const a = item(5, 1);
      await store.put(a);
      expect((await store.list())[0].theme).toEqual(a.theme);
    });

    it("opens 50 saved themes well inside 100 ms", async () => {
      const store = await make();
      for (let i = 0; i < 50; i++) await store.put(item(i, i));
      const t0 = performance.now();
      const all = await store.list();
      expect(all).toHaveLength(50);
      expect(performance.now() - t0).toBeLessThan(100);
    });
  });
}

behaves("memory store", async () => memoryStore());
behaves("IndexedDB store", () => indexedDbStore(new IDBFactory()));

describe("IndexedDB store", () => {
  it("keeps themes between visits", async () => {
    const factory = new IDBFactory();
    const first = await indexedDbStore(factory);
    await first.put(item(3, 10));
    const again = await indexedDbStore(factory);
    expect((await again.list()).map((x) => x.theme.name)).toEqual(["Theme 3"]);
  });

  it("skips records it can't read instead of failing the whole list", async () => {
    const factory = new IDBFactory();
    const store = await indexedDbStore(factory);
    await store.put(item(4, 10));
    // A record from a newer app, and one that isn't a theme at all.
    const db = await new Promise<IDBDatabase>((res) => {
      const r = factory.open("syntaxhue", 1);
      r.onsuccess = () => res(r.result);
    });
    const tx = db.transaction("themes", "readwrite");
    tx.objectStore("themes").put({ id: "future", theme: { version: 99 }, savedAt: 1 });
    tx.objectStore("themes").put({ id: "junk", theme: "nope" });
    await new Promise((res) => (tx.oncomplete = res));
    expect((await store.list()).map((x) => x.theme.name)).toEqual(["Theme 4"]);
  });
});

describe("openLibrary", () => {
  it("uses the browser database when there is one", async () => {
    expect((await openLibrary(new IDBFactory())).persistent).toBe(true);
  });

  it("falls back to memory when IndexedDB is missing or refuses to open", async () => {
    expect((await openLibrary(undefined)).persistent).toBe(false);
    const refusing = {
      open() {
        throw new DOMException("denied", "SecurityError");
      },
    } as unknown as IDBFactory;
    const store = await openLibrary(refusing);
    expect(store.persistent).toBe(false);
    await store.put(item(6, 1));
    expect(await store.list()).toHaveLength(1);
  });
});
