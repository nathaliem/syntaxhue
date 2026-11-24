import { isHex } from "./color";
import { ROLE_IDS, THEME_VERSION, VIBE_KEYS, ZERO_VIBE, type FontStyle, type ThemeState, type Vibe } from "./theme";

/**
 * Versioned persistence for `ThemeState` (saved in the browser and carried by share links).
 *
 * To change the saved shape: bump `THEME_VERSION`, add `MIGRATIONS[oldVersion]` that turns the
 * old shape into the next one, and add a test with a fixture of the old shape.
 */

/** Turns version N data into version N+1 data. Input is untrusted, so read it defensively. */
export type Migration = (old: Record<string, unknown>) => Record<string, unknown>;

/** Keyed by the version being migrated *from*. */
export const MIGRATIONS: Record<number, Migration> = {
  // v2 added the vibe sliders. Existing themes start with all of them at 0.
  1: (old) => ({ ...old, vibe: { ...ZERO_VIBE } }),
};

const FONT_STYLES: readonly FontStyle[] = ["italic", "bold", "underline"];

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Brings stored data up to `current` by applying migrations one version at a time.
 * Returns null if the version is missing, unknown, from a newer app, or a migration is missing.
 */
export function migrate(
  raw: unknown,
  migrations: Record<number, Migration> = MIGRATIONS,
  current: number = THEME_VERSION,
): Record<string, unknown> | null {
  if (!isObject(raw)) return null;
  let data = raw;
  let version = data.version;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1 || version > current) return null;
  while (version < current) {
    const step = migrations[version];
    if (!step) return null;
    try {
      data = step(data);
    } catch {
      return null;
    }
    version += 1;
    if (!isObject(data)) return null;
    data = { ...data, version };
  }
  return data;
}

/** Vibe values are clamped to -1..1 and rounded to the slider step; anything else counts as 0. */
export function readVibe(raw: unknown): Vibe {
  const vibe = { ...ZERO_VIBE };
  if (!isObject(raw)) return vibe;
  for (const k of VIBE_KEYS) {
    const v = raw[k];
    if (typeof v === "number" && Number.isFinite(v)) vibe[k] = Math.round(Math.max(-1, Math.min(1, v)) * 100) / 100;
  }
  return vibe;
}

/** Validates current-version data and drops what it can safely drop. Null if it isn't a usable theme. */
export function validateTheme(data: Record<string, unknown>): ThemeState | null {
  if (data.version !== THEME_VERSION) return null;
  if (data.mode !== "dark" && data.mode !== "light") return null;
  if (!isObject(data.roles)) return null;
  const roles = {} as ThemeState["roles"];
  for (const id of ROLE_IDS) {
    const r = data.roles[id];
    if (!isObject(r) || typeof r.color !== "string" || !isHex(r.color)) return null;
    const fontStyle = Array.isArray(r.fontStyle)
      ? FONT_STYLES.filter((s) => (r.fontStyle as unknown[]).includes(s))
      : [];
    roles[id] = { color: r.color.toLowerCase(), locked: r.locked === true, fontStyle };
  }
  const name = typeof data.name === "string" ? data.name.slice(0, 60) : "Untitled";
  return { version: THEME_VERSION, name, mode: data.mode, roles, vibe: readVibe(data.vibe) };
}

/** Anything stored or received as JSON -> a current, valid `ThemeState`, or null (callers start fresh). */
export function parseTheme(raw: unknown): ThemeState | null {
  const data = migrate(raw);
  return data ? validateTheme(data) : null;
}
