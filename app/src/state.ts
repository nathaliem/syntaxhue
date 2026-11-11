import { useEffect, useReducer } from "react";
import { generate, type FontStyle, type Mode, type RoleId, type ThemeState } from "./engine/theme";
import { decodeTheme, encodeTheme } from "./engine/share";

const HISTORY_LIMIT = 50;
const STORAGE_KEY = "hueprint:current";

interface History {
  past: ThemeState[];
  present: ThemeState;
  future: ThemeState[];
  /** State before an in-progress slider drag, so one drag = one undo step. */
  pending?: ThemeState;
}

export type Action =
  | { type: "shuffle" }
  | { type: "mode"; mode: Mode }
  | { type: "color"; role: RoleId; color: string; commit?: boolean }
  | { type: "lock"; role: RoleId }
  | { type: "lockAll"; locked: boolean }
  | { type: "style"; role: RoleId; style: FontStyle }
  | { type: "name"; name: string }
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

function reducer(h: History, a: Action): History {
  const t = h.present;
  switch (a.type) {
    case "shuffle":
      return push(h, generate(newSeed(), t.mode, t));
    case "mode":
      return a.mode === t.mode ? h : push(h, generate(newSeed(), a.mode));
    case "color": {
      const next = updateRole(t, a.role, { color: a.color });
      // Slider drags replace the present state; a commit (pointer up / hex entry) records history.
      if (a.commit === false) return { ...h, present: next, pending: h.pending ?? h.present };
      return push(h, next);
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
    case "undo":
      if (!h.past.length) return h;
      return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
    case "redo":
      if (!h.future.length) return h;
      return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
  }
}

function initial(): History {
  // 1. shared link (#t=...)  2. autosave  3. fresh shuffle
  const m = location.hash.match(/[#&]t=([^&]+)/);
  if (m) {
    const t = decodeTheme(m[1]);
    if (t) {
      history.replaceState(null, "", location.pathname + location.search);
      return { past: [], present: t, future: [] };
    }
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const t = JSON.parse(saved) as ThemeState;
      if (t?.version === 1 && t.roles?.bg) return { past: [], present: t, future: [] };
    }
  } catch {
    /* storage unavailable or corrupt: start fresh */
  }
  const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)").matches;
  return { past: [], present: generate(newSeed(), prefersLight ? "light" : "dark"), future: [] };
}

export function useThemeStore() {
  const [h, dispatch] = useReducer(reducer, undefined, initial);

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(h.present));
      } catch {
        /* ignore */
      }
    }, 250);
    return () => clearTimeout(id);
  }, [h.present]);

  return {
    theme: h.present,
    canUndo: h.past.length > 0,
    canRedo: h.future.length > 0,
    dispatch,
  };
}

export function shareUrl(t: ThemeState): string {
  return `${location.origin}${location.pathname}#t=${encodeTheme(t)}`;
}
