import { hexToRgb, type Hex } from "./color";
import { encodePng } from "./png";
import type { RoleId, ThemeState } from "./theme";
import { effectiveTheme } from "./vibe";

/** Marketplace icons should be at least this many pixels square. */
export const ICON_SIZE = 128;

interface Bar {
  x: number;
  y: number;
  w: number;
  role: RoleId;
}

// A tiny code window: lines of colored bars in the theme's own colors, plus an accent text cursor.
const BAR_H = 10;
const BARS: Bar[] = [
  { x: 22, y: 30, w: 30, role: "keyword" },
  { x: 58, y: 30, w: 46, role: "function" },
  { x: 34, y: 50, w: 28, role: "type" },
  { x: 68, y: 50, w: 36, role: "string" },
  { x: 34, y: 70, w: 52, role: "variable" },
  { x: 92, y: 70, w: 12, role: "constant" },
  { x: 22, y: 90, w: 22, role: "keyword" },
  { x: 50, y: 90, w: 34, role: "muted" },
];
const CURSOR = { x: 90, y: 88, w: 4, h: 14 };
const RADIUS = 26;

/** How far inside a rounded rectangle a point is: positive inside, negative outside, in pixels. */
function inside(px: number, py: number, x: number, y: number, w: number, h: number, r: number): number {
  const cx = Math.min(Math.max(px, x + r), x + w - r);
  const cy = Math.min(Math.max(py, y + r), y + h - r);
  return r - Math.hypot(px - cx, py - cy);
}

/** The icon as RGBA pixels. Four samples per pixel along each axis keep the edges smooth. */
export function iconPixels(theme: ThemeState, size = ICON_SIZE): Uint8Array {
  const t = effectiveTheme(theme);
  const color = (id: RoleId) => hexToRgb(t.roles[id].color as Hex);
  const bg = color("bg");
  const accent = color("accent");
  const scale = size / ICON_SIZE;
  const SS = 4;
  const out = new Uint8Array(size * size * 4);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let a = 0;
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) / scale;
          const y = (py + (sy + 0.5) / SS) / scale;
          if (inside(x, y, 0, 0, ICON_SIZE, ICON_SIZE, RADIUS) < 0) continue;
          let c = bg;
          for (const bar of BARS) {
            if (inside(x, y, bar.x, bar.y, bar.w, BAR_H, BAR_H / 2) >= 0) c = color(bar.role);
          }
          if (inside(x, y, CURSOR.x, CURSOR.y, CURSOR.w, CURSOR.h, 2) >= 0) c = accent;
          a++;
          r += c[0];
          g += c[1];
          b += c[2];
        }
      }
      const i = (py * size + px) * 4;
      if (a === 0) continue;
      out[i] = Math.round(r / a);
      out[i + 1] = Math.round(g / a);
      out[i + 2] = Math.round(b / a);
      out[i + 3] = Math.round((255 * a) / (SS * SS));
    }
  }
  return out;
}

export function iconPng(theme: ThemeState): Uint8Array {
  return encodePng(ICON_SIZE, ICON_SIZE, iconPixels(theme));
}
