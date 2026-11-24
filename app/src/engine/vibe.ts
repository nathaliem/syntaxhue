import { fixContrast, hexToOklch, oklchToHexInGamut, type Hex, type Oklch } from "./color";
import { ROLES, type RoleId, type ThemeState, type Vibe } from "./theme";

/**
 * Vibe: four global sliders (-1..1, 0 = off) applied on top of the roles without changing them.
 * `effectiveTheme` is what the preview and every export show. The stored roles stay the user's own colors.
 *
 *  - contrast:   text-like roles move away from (crisp) or toward (soft) the background's lightness.
 *  - saturation: chroma scaled between 40 % (muted) and 160 % (vivid), kept inside sRGB.
 *  - warmth:     hues pulled toward orange (warm) or blue (cool), up to 25 %; near-greys get a faint tint.
 *  - depth:      scales the lightness steps of the surface ladder. See `surfaces` in derive.ts.
 *    It only touches derived surfaces, never role colors.
 *
 * After the color sliders, every role is pushed back (lightness only) to at least its contrast minimum.
 */

const WARM_HUE = 55;
const COOL_HUE = 250;
const MAX_HUE_PULL = 0.25;
const MAX_L_SHIFT = 0.1;
const SATURATION_RANGE = 0.6;
const GREY_TINT = 0.015;
const GREY_CHROMA = 0.04;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** True when any slider that recolors roles is away from 0 (depth only changes surfaces). */
export function recolorsRoles(v: Vibe): boolean {
  return v.contrast !== 0 || v.saturation !== 0 || v.warmth !== 0;
}

/** Move hue `h` toward `target` along the short way round by fraction `f`. */
function pullHue(h: number, target: number, f: number): number {
  const delta = ((target - h + 540) % 360) - 180;
  return (h + delta * f + 360) % 360;
}

const effectiveThemes = new WeakSet<ThemeState>();
const cache = new WeakMap<ThemeState, ThemeState>();

/**
 * The theme as it should look and export: roles with vibe applied. With no recoloring vibe it returns
 * the very same object, so resetting to 0 gives back exactly the original colors. Passing an
 * already-effective theme returns it unchanged, so vibe can't be applied twice.
 */
export function effectiveTheme(t: ThemeState): ThemeState {
  if (!recolorsRoles(t.vibe) || effectiveThemes.has(t)) return t;
  const hit = cache.get(t);
  if (hit) return hit;

  const v = t.vibe;
  const bgL = hexToOklch(t.roles.bg.color).l;
  const away = bgL < 0.5 ? 1 : -1; // direction that increases contrast with the background

  const moved = {} as Record<RoleId, Hex>;
  for (const def of ROLES) {
    const o: Oklch = hexToOklch(t.roles[def.id].color);
    if (v.warmth !== 0) {
      const target = v.warmth > 0 ? WARM_HUE : COOL_HUE;
      const w = Math.abs(v.warmth);
      const hue = o.c < 1e-4 ? target : o.h; // a pure grey has no hue to pull from
      o.h = pullHue(hue, target, MAX_HUE_PULL * w);
      if (o.c < GREY_CHROMA) o.c += GREY_TINT * w * (1 - o.c / GREY_CHROMA);
    }
    if (v.saturation !== 0) o.c *= 1 + SATURATION_RANGE * v.saturation;
    if (v.contrast !== 0 && def.min > 0) o.l = clamp01(o.l + away * MAX_L_SHIFT * v.contrast);
    moved[def.id] = oklchToHexInGamut(o);
  }

  const bg = moved.bg;
  const roles = {} as ThemeState["roles"];
  for (const def of ROLES) {
    const color = def.min > 0 ? fixContrast(moved[def.id], bg, def.min) : moved[def.id];
    roles[def.id] = { ...t.roles[def.id], color };
  }
  const out: ThemeState = { ...t, roles };
  effectiveThemes.add(out);
  cache.set(t, out);
  return out;
}
