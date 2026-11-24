import { colorDistance, contrast, fixContrast, hexToOklch, mix, oklchToHexInGamut, type Hex } from "./color";
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
/** Least OKLCH distance between any two of the six hues, and between a color and its bright variant. */
export const ANSI_MIN_APART = 0.05;
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

  const hues = [roles.error, roles.success, roles.warning, roles.info, roles.keyword, roles.function];
  const normal = hues.map((h) => fixContrast(h, bg, ANSI_MIN_HUE));
  // Nudge a hue away from an earlier one when two land too close (e.g. a cyan function next to a blue info).
  for (let i = 1; i < normal.length; i++) {
    for (let tries = 0; tries < 12; tries++) {
      if (normal.slice(0, i).every((p) => colorDistance(p, normal[i]) >= ANSI_MIN_APART)) break;
      const o = hexToOklch(normal[i]);
      normal[i] = fixContrast(
        oklchToHexInGamut({ l: o.l + (dark ? 0.03 : -0.03), c: o.c * 1.08, h: (o.h + 12) % 360 }),
        bg,
        ANSI_MIN_HUE,
      );
    }
  }
  const vivid = (hex: Hex) => {
    const o = hexToOklch(hex);
    return fixContrast(oklchToHexInGamut({ l: o.l + (dark ? 0.07 : -0.06), c: o.c * 1.12, h: o.h }), bg, ANSI_MIN_HUE);
  };

  const black = dark ? mix(bg, roles.fg, 0.2) : roles.fg;
  const white = dark ? mix(roles.fg, bg, 0.15) : mix(bg, roles.fg, 0.12);
  const brightBlack = fixContrast(roles.muted, bg, ANSI_MIN_DIM);
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
