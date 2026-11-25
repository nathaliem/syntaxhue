import { trackEvent } from "./analytics";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  generate,
  HARMONY_NAMES,
  unlockedCount,
  ZERO_VIBE,
  type FontStyle,
  type Harmony,
  type Mode,
  type RoleId,
  type ThemeState,
  type VibeKey,
} from "./engine/theme";
import { parseTheme } from "./engine/schema";
import { decodeTheme, encodeTheme } from "./engine/share";

const HISTORY_LIMIT = 50;
const STORAGE_KEY = "hueprint:current";
const HARMONY_KEY = "hueprint:harmony";
const CHROME_KEY = "hueprint:chrome";

/** Which colors the app's own interface uses: the theme's mode ("auto") or always light or dark. */
export type ChromePref = "auto" | Mode;

export interface History {
  past: ThemeState[];
  present: ThemeState;
  future: ThemeState[];
  /** State before an in-progress edit (slider drag, hex typing), so one edit = one undo step. */
  pending?: ThemeState;
}

export type Action =
  | { type: "shuffle"; seed?: number }
  | { type: "mode"; mode: Mode; seed?: number }
  | { type: "color"; role: RoleId; color: string; commit?: boolean }
  | { type: "lock"; role: RoleId }
  | { type: "lockAll"; locked: boolean }
  | { type: "vibe"; key: VibeKey; value: number; commit?: boolean }
  | { type: "vibeReset"; key?: VibeKey }
  | { type: "style"; role: RoleId; style: FontStyle }
  | { type: "name"; name: string }
  | { type: "load"; theme: ThemeState }
  | { type: "undo" }
  | { type: "redo" };

const newSeed = () => Math.floor(Math.random() * 2 ** 31);

function push(h: History, next: ThemeState): History {
  const before = h.pending ?? h.present;
  return { past: [...h.past, before].slice(-HISTORY_LIMIT), present: next, future: [] };
}

function updateRole(t: ThemeState, role: RoleId, patch: Partial<ThemeState["roles"][RoleId]>): ThemeState {
  return { ...t, roles: { ...t.roles, [role]: { ...t.roles[role], ...patch } } };
}

/** `harmony` is the generator setting a shuffle or mode switch draws its hues from. */
export function reducer(h: History, a: Action, harmony: Harmony = "auto"): History {
  const t = h.present;
  switch (a.type) {
    case "shuffle":
      // Nothing to change when every color is locked; don't add an empty undo step.
      if (unlockedCount(t) === 0) return h;
      return push(h, generate(a.seed ?? newSeed(), t.mode, t, harmony));
    case "mode":
      // Pass the current theme so locked colors carry over to the new mode.
      return a.mode === t.mode ? h : push(h, generate(a.seed ?? newSeed(), a.mode, t, harmony));
    case "color": {
      if (a.commit === false) {
        // In-progress edit: replace the present state and remember where the edit started.
        return { ...h, present: updateRole(t, a.role, { color: a.color }), pending: h.pending ?? h.present };
      }
      // A commit that changes nothing and ends no edit is not worth an undo step.
      if (!h.pending && t.roles[a.role].color === a.color) return h;
      return push(h, updateRole(t, a.role, { color: a.color }));
    }
    case "vibe": {
      const value = Math.round(Math.max(-1, Math.min(1, a.value)) * 100) / 100;
      const next = { ...t, vibe: { ...t.vibe, [a.key]: value } };
      if (a.commit === false) return { ...h, present: next, pending: h.pending ?? h.present }; // mid-drag
      if (!h.pending && t.vibe[a.key] === value) return h; // nothing changed, no undo step
      return push(h, next);
    }
    case "vibeReset": {
      const vibe = a.key ? { ...t.vibe, [a.key]: 0 } : { ...ZERO_VIBE };
      if (!h.pending && (Object.keys(vibe) as VibeKey[]).every((k) => vibe[k] === t.vibe[k])) return h;
      return push(h, { ...t, vibe });
    }
    case "lock":
      return { ...h, present: updateRole(t, a.role, { locked: !t.roles[a.role].locked }) };
    case "lockAll": {
      const roles = { ...t.roles };
      for (const k of Object.keys(roles) as RoleId[]) roles[k] = { ...roles[k], locked: a.locked };
      return { ...h, present: { ...t, roles } };
    }
    case "style": {
      const cur = t.roles[a.role].fontStyle;
      const fontStyle = cur.includes(a.style) ? cur.filter((s) => s !== a.style) : [...cur, a.style];
      return push(h, updateRole(t, a.role, { fontStyle }));
    }
    case "name":
      return { ...h, present: { ...t, name: a.name } };
    case "load":
      return push(h, a.theme);
    case "undo":
      if (!h.past.length) return h;
      return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
    case "redo":
      if (!h.future.length) return h;
      return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
  }
}

// ---------- startup and share links ----------

export type Notice = { kind: "shared"; previous: ThemeState | null } | { kind: "badLink" };

function readSaved(): ThemeState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return parseTheme(JSON.parse(saved)); // null for corrupt data or a version we can't read
  } catch {
    return null; // storage unavailable or corrupt
  }
}

/** Whether the last write of the current theme reached browser storage. */
export type SaveState = "saved" | "failed";

/** Edits are written after this long without another edit, and at once when the page is hidden or closed. */
const SAVE_DELAY_MS = 250;

/** Writes the current theme. False when the browser refuses (storage blocked, full, or disabled). */
function persist(t: ThemeState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
    return true;
  } catch {
    return false;
  }
}

/** Forgets the autosaved theme, so the next start begins with a fresh one. */
export function clearSavedTheme(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable: nothing to clear */
  }
}

function clearHash() {
  history.replaceState(null, "", location.pathname + location.search);
}

/** `/s?t=…` is the opt-in link with a preview image. Once read, the address goes back to plain `/`. */
function takeQueryCode(): string | null {
  const code = new URLSearchParams(location.search).get("t");
  if (code === null) return null;
  const rest = new URLSearchParams(location.search);
  rest.delete("t");
  const path = location.pathname === "/s" ? "/" : location.pathname;
  const q = rest.toString();
  history.replaceState(null, "", path + (q ? `?${q}` : "") + location.hash);
  return code;
}

/** Reads `#t=…` (or the opt-in `?t=…`) from the URL. undefined = no link, null = a link we can't read. */
function readLink(): ThemeState | null | undefined {
  const fromQuery = takeQueryCode();
  if (fromQuery !== null) return decodeTheme(fromQuery);
  const m = location.hash.match(/[#&]t=([^&]+)/);
  if (!m) return undefined;
  clearHash();
  return decodeTheme(m[1]);
}

interface Boot {
  theme: ThemeState;
  notice: Notice | null;
}

function boot(): Boot {
  const saved = readSaved();
  const link = readLink();
  if (link) return { theme: link, notice: { kind: "shared", previous: saved } };
  const notice: Notice | null = link === null ? { kind: "badLink" } : null;
  if (saved) return { theme: saved, notice };
  const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)").matches;
  return { theme: generate(newSeed(), prefersLight ? "light" : "dark"), notice };
}

function readHarmony(): Harmony {
  try {
    const v = localStorage.getItem(HARMONY_KEY);
    return v && (HARMONY_NAMES as string[]).includes(v) ? (v as Harmony) : "auto";
  } catch {
    return "auto";
  }
}

function readChrome(): ChromePref {
  try {
    const v = localStorage.getItem(CHROME_KEY);
    return v === "light" || v === "dark" ? v : "auto";
  } catch {
    return "auto";
  }
}

export function useThemeStore() {
  const [start] = useState(boot);
  const [chrome, setChromeState] = useState<ChromePref>(readChrome);
  const setChrome = useCallback((next: ChromePref) => {
    setChromeState(next);
    try {
      if (next === "auto") localStorage.removeItem(CHROME_KEY);
      else localStorage.setItem(CHROME_KEY, next);
    } catch {
      /* storage blocked: the choice lasts until the tab closes */
    }
  }, []);
  const [harmony, setHarmonyState] = useState<Harmony>(readHarmony);
  const setHarmony = useCallback((next: Harmony) => {
    setHarmonyState(next);
    try {
      if (next === "auto") localStorage.removeItem(HARMONY_KEY);
      else localStorage.setItem(HARMONY_KEY, next);
    } catch {
      /* storage blocked: the choice lasts until the tab closes */
    }
  }, []);
  const [h, rawDispatch] = useReducer(
    (hist: History, a: Action) => reducer(hist, a, harmony),
    start.theme,
    (t): History => ({ past: [], present: t, future: [] }),
  );
  // Counts a first shuffle and a first hand edit per visit; never looks at what the colors are.
  const dispatch = useCallback((a: Action) => {
    if (a.type === "shuffle") trackEvent("shuffle");
    else if (a.type === "color" || a.type === "vibe" || a.type === "style") trackEvent("edit");
    rawDispatch(a);
  }, []);
  const [notice, setNotice] = useState<Notice | null>(start.notice);
  /** The shared theme that was opened; it isn't autosaved until the user edits or keeps it. */
  const [unsavedShared, setUnsavedShared] = useState<ThemeState | null>(
    start.notice?.kind === "shared" ? start.theme : null,
  );

  // Opening a share link while the app is already open.
  useEffect(() => {
    const onHash = () => {
      const link = readLink();
      if (link === undefined) return;
      if (link === null) return setNotice({ kind: "badLink" });
      setNotice({ kind: "shared", previous: readSaved() });
      setUnsavedShared(link);
      dispatch({ type: "load", theme: link });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [dispatch]);

  // The newest theme that still has to be written. It is written after a short pause, and immediately when the
  // page is hidden or closed, so closing the tab right after an edit doesn't lose it.
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const unsaved = useRef<ThemeState | null>(null);
  const flush = useCallback(() => {
    const t = unsaved.current;
    if (!t) return;
    unsaved.current = null;
    setSaveState(persist(t) ? "saved" : "failed");
  }, []);

  useEffect(() => {
    // Don't overwrite the user's own saved theme just because they opened a link.
    if (unsavedShared && h.present === unsavedShared) return;
    unsaved.current = h.present;
    const id = setTimeout(flush, SAVE_DELAY_MS);
    return () => clearTimeout(id);
  }, [h.present, unsavedShared, flush]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [flush]);

  const dismissNotice = useCallback(() => {
    setNotice(null);
    setUnsavedShared(null); // "Keep this one": the shared theme is now autosaved like any other
  }, []);

  const restorePrevious = useCallback(() => {
    if (notice?.kind === "shared" && notice.previous) dispatch({ type: "load", theme: notice.previous });
    setNotice(null);
    setUnsavedShared(null);
  }, [notice, dispatch]);

  return {
    theme: h.present,
    canUndo: h.past.length > 0,
    canRedo: h.future.length > 0,
    saveState,
    dispatch,
    harmony,
    setHarmony,
    chrome,
    setChrome,
    chromeMode: (chrome === "auto" ? h.present.mode : chrome) as Mode,
    notice,
    dismissNotice,
    restorePrevious,
  };
}

export function shareUrl(t: ThemeState): string {
  return `${location.origin}${location.pathname}#t=${encodeTheme(t)}`;
}

/** The opt-in link: the server reads the code to give the link its own preview image. */
export function previewShareUrl(t: ThemeState): string {
  return `${location.origin}/s?t=${encodeTheme(t)}`;
}
