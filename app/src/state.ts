import { useCallback, useEffect, useReducer, useState } from "react";
import { generate, type FontStyle, type Mode, type RoleId, type ThemeState } from "./engine/theme";
import { decodeTheme, encodeTheme } from "./engine/share";

const HISTORY_LIMIT = 50;
const STORAGE_KEY = "hueprint:current";

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

export function reducer(h: History, a: Action): History {
  const t = h.present;
  switch (a.type) {
    case "shuffle":
      return push(h, generate(a.seed ?? newSeed(), t.mode, t));
    case "mode":
      // Pass the current theme so locked colors carry over to the new mode.
      return a.mode === t.mode ? h : push(h, generate(a.seed ?? newSeed(), a.mode, t));
    case "color": {
      if (a.commit === false) {
        // In-progress edit: replace the present state and remember where the edit started.
        return { ...h, present: updateRole(t, a.role, { color: a.color }), pending: h.pending ?? h.present };
      }
      // A commit that changes nothing and ends no edit is not worth an undo step.
      if (!h.pending && t.roles[a.role].color === a.color) return h;
      return push(h, updateRole(t, a.role, { color: a.color }));
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
    const t = JSON.parse(saved) as ThemeState;
    return t?.version === 1 && t.roles?.bg ? t : null;
  } catch {
    return null; // storage unavailable or corrupt
  }
}

function clearHash() {
  history.replaceState(null, "", location.pathname + location.search);
}

/** Reads `#t=…` from the URL. undefined = no link, null = a link we can't read. */
function readLink(): ThemeState | null | undefined {
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

export function useThemeStore() {
  const [start] = useState(boot);
  const [h, dispatch] = useReducer(reducer, start.theme, (t): History => ({ past: [], present: t, future: [] }));
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
  }, []);

  useEffect(() => {
    // Don't overwrite the user's own saved theme just because they opened a link.
    if (unsavedShared && h.present === unsavedShared) return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(h.present));
      } catch {
        /* ignore */
      }
    }, 250);
    return () => clearTimeout(id);
  }, [h.present, unsavedShared]);

  const dismissNotice = useCallback(() => {
    setNotice(null);
    setUnsavedShared(null); // "Keep this one": the shared theme is now autosaved like any other
  }, []);

  const restorePrevious = useCallback(() => {
    if (notice?.kind === "shared" && notice.previous) dispatch({ type: "load", theme: notice.previous });
    setNotice(null);
    setUnsavedShared(null);
  }, [notice]);

  return {
    theme: h.present,
    canUndo: h.past.length > 0,
    canRedo: h.future.length > 0,
    dispatch,
    notice,
    dismissNotice,
    restorePrevious,
  };
}

export function shareUrl(t: ThemeState): string {
  return `${location.origin}${location.pathname}#t=${encodeTheme(t)}`;
}
