import { surfaces, type Surfaces } from "../derive";
import type { Hex } from "../color";
import type { FontStyle, Mode, RoleId, ThemeState } from "../theme";
import { effectiveTheme } from "../vibe";

/**
 * What a port starts from: the roles (vibe already applied) and the derived surface ladder.
 * A port never reads the VS Code theme JSON, so a fix in the engine reaches every target.
 */
export interface PortInput {
  name: string;
  mode: Mode;
  roles: Record<RoleId, Hex>;
  /** The font styles the user gave each role (italic, bold, underline). */
  styles: Record<RoleId, FontStyle[]>;
  surfaces: Surfaces;
}

export interface PortFile {
  /** Suggested file name, relative, with forward slashes. */
  path: string;
  content: string;
}

/** One place where the target shows a role's color, and what it is drawn on. */
export interface PortUse {
  role: RoleId;
  /** The color as written in the files (the shared tests look for it there). */
  color: Hex;
  /** How the color is spelled in the files when that is not `#rrggbb` (e.g. `rrggbb`); the shared tests search for this. */
  written?: string;
  /** The background it is read on; leave out for colors that are not text (the shared tests skip contrast). */
  on?: Hex;
}

export interface PortTarget {
  /** Stable id, used in URLs and file names. */
  id: string;
  label: string;
  group: "editor" | "terminal" | "data";
  /** Where the user puts the files, in plain words. */
  install: string;
  files(input: PortInput): PortFile[];
  /** Every role the files use and where. Every role must appear at least once, or be named in `unused`. */
  uses(input: PortInput): PortUse[];
  /** Roles this target has no place for, with the reason. */
  unused?: Partial<Record<RoleId, string>>;
}

export function portInput(theme: ThemeState): PortInput {
  const t = effectiveTheme(theme);
  const roles = Object.fromEntries(Object.entries(t.roles).map(([id, r]) => [id, r.color])) as Record<RoleId, Hex>;
  const styles = Object.fromEntries(Object.entries(t.roles).map(([id, r]) => [id, [...r.fontStyle]])) as Record<
    RoleId,
    FontStyle[]
  >;
  return { name: t.name, mode: t.mode, roles, styles, surfaces: surfaces(t) };
}

export function runPort(target: PortTarget, theme: ThemeState): PortFile[] {
  return target.files(portInput(theme));
}
