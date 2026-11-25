import { contrast, fixContrast, hexToOklch, mix, oklchToHexInGamut, type Hex } from "./color";
import type { PortInput } from "./ports/port";

export const ANSI_NAMES = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"] as const;

export interface AnsiPalette {
  background: Hex;
  foreground: Hex;
  cursor: Hex;
  /** Selection background, opaque (terminals rarely support alpha). */
  selection: Hex;
  /** The 8 normal colors in ANSI order (black, red, green, yellow, blue, magenta, cyan, white). */
  normal: Hex[];
  /** The 8 bright colors, same order. */
  bright: Hex[];
}

/** Minimum contrast for the colors programs print as text: the six hues, and bright black (used for comments and hints). */
export const ANSI_MIN_HUE = 4.5;
export const ANSI_MIN_DIM = 3;
/** Least OKLCH distance between a color and its bright variant. */
export const ANSI_MIN_BRIGHT_STEP = 0.03;

/**
 * 16 terminal colors from the roles. The hues follow the VS Code terminal mapping: red is Error, green Success,
 * yellow Warning, blue Info, magenta Keyword, cyan Function. Bright variants are more vivid: lighter on dark
 * backgrounds, darker on light ones. Black and white are the two ends of the theme (text color and a surface),
 * bright black is the muted role so comments and hints stay readable.
 */
export function ansiPalette(input: PortInput): AnsiPalette {
  const { roles, surfaces, mode } = input;
  const bg = surfaces.editor;
  const dark = mode === "dark";

  // The six hues are the user's own colors and are exported exactly as picked: no contrast fix, no nudging.
  const normal = [roles.error, roles.success, roles.warning, roles.info, roles.keyword, roles.function];
  // The bright variants are derived, so they may be adjusted, but never to read worse than the color they come from.
  const vivid = (hex: Hex) => {
    const o = hexToOklch(hex);
    const floor = Math.min(ANSI_MIN_HUE, contrast(hex, bg));
    return fixContrast(oklchToHexInGamut({ l: o.l + (dark ? 0.07 : -0.06), c: o.c * 1.12, h: o.h }), bg, floor);
  };

  const black = dark ? mix(bg, roles.fg, 0.2) : roles.fg;
  const white = dark ? mix(roles.fg, bg, 0.15) : mix(bg, roles.fg, 0.12);
  const brightBlack = roles.muted;
  const brightWhite = dark ? roles.fg : bg;

  return {
    background: bg,
    foreground: roles.fg,
    cursor: roles.accent,
    selection: mix(bg, roles.accent, dark ? 0.3 : 0.22),
    normal: [black, ...normal, white],
    bright: [brightBlack, ...normal.map(vivid), brightWhite],
  };
}

/** Contrast of every printable ANSI color against the background, for tests and the UI. */
export function ansiContrast(p: AnsiPalette) {
  return {
    foreground: contrast(p.foreground, p.background),
    hues: [...p.normal.slice(1, 7), ...p.bright.slice(1, 7)].map((c) => contrast(c, p.background)),
    brightBlack: contrast(p.bright[0], p.background),
  };
}
