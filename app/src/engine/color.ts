// Color math: OKLCH <-> sRGB hex, WCAG contrast.
export type Hex = string; // "#rrggbb"
export interface Oklch {
  l: number;
  c: number;
  h: number;
}

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

function srgbToLinear(c: number) {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function linearToSrgb(c: number) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

export function isHex(s: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(s);
}

export function normalizeHex(s: string): Hex | null {
  let v = s.trim();
  if (!v.startsWith("#")) v = "#" + v;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) v = "#" + [...v.slice(1)].map((ch) => ch + ch).join("");
  return isHex(v) ? v.toLowerCase() : null;
}

export function hexToRgb(hex: Hex): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): Hex {
  return (
    "#" +
    [r, g, b]
      .map((v) =>
        Math.round(clamp(v, 0, 255))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

function oklchToLinearRgb({ l, c, h }: Oklch): [number, number, number] {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

const IN_GAMUT = 1e-4;
const inGamut = (o: Oklch) => oklchToLinearRgb(o).every((v) => v >= -IN_GAMUT && v <= 1 + IN_GAMUT);

/**
 * OKLCH -> hex. A color outside sRGB keeps its lightness and hue and has its chroma lowered to the most the gamut
 * allows (found by bisection), instead of having channels clipped, which would shift the hue.
 */
export function oklchToHex(o: Oklch): Hex {
  if (o.c <= 0 || inGamut(o)) return oklchToHexClipped(o);
  let lo = 0;
  let hi = o.c;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut({ ...o, c: mid })) lo = mid;
    else hi = mid;
  }
  return oklchToHexClipped({ ...o, c: lo });
}

/** Same as `oklchToHex`; the older name, kept so callers read the same. */
export const oklchToHexInGamut = oklchToHex;

/** OKLCH -> hex with out-of-gamut channels clipped. Only for values already known to be inside sRGB. */
function oklchToHexClipped({ l, c, h }: Oklch): Hex {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const r = 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_;
  const g = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_;
  const bl = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_;
  return rgbToHex(linearToSrgb(clamp(r)) * 255, linearToSrgb(clamp(g)) * 255, linearToSrgb(clamp(bl)) * 255);
}

export function hexToOklch(hex: Hex): Oklch {
  const [r, g, b] = hexToRgb(hex).map((v) => srgbToLinear(v / 255));
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const c = Math.sqrt(A * A + B * B);
  let h = (Math.atan2(B, A) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c, h: c < 1e-4 ? 0 : h };
}

export function luminance(hex: Hex): number {
  const [r, g, b] = hexToRgb(hex).map((v) => srgbToLinear(v / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio, 1..21 */
export function contrast(a: Hex, b: Hex): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** APCA's own exponent for near-black text, not the square root of two. */
const APCA_BLACK_CLAMP = 1.4 + 0.014;

/**
 * APCA Lc (0.0.98G-4g), the perceptual contrast of `text` on `bg`. Advisory only: the pass/fail checks stay WCAG.
 * Signed in the original (negative for light text on a dark background); this returns the magnitude, 0..~108.
 */
export function apca(text: Hex, bg: Hex): number {
  const y = (hex: Hex) => {
    const [r, g, b] = hexToRgb(hex).map((v) => Math.pow(v / 255, 2.4));
    const lum = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
    return lum < 0.022 ? lum + Math.pow(0.022 - lum, APCA_BLACK_CLAMP) : lum; // soft clamp near black
  };
  const yt = y(text);
  const yb = y(bg);
  if (Math.abs(yb - yt) < 0.0005) return 0;
  const sapc =
    yb > yt ? (Math.pow(yb, 0.56) - Math.pow(yt, 0.57)) * 1.14 : (Math.pow(yb, 0.65) - Math.pow(yt, 0.62)) * 1.14;
  const lc = Math.abs(sapc) < 0.1 ? 0 : Math.abs(sapc) - 0.027;
  return lc * 100;
}

/**
 * Nudge only the lightness of `color` (away from `bg`) until it reaches `min` contrast.
 * Hue and chroma are kept. Returns the original color if it already passes.
 */
export function fixContrast(color: Hex, bg: Hex, min: number): Hex {
  if (contrast(color, bg) >= min) return color;
  const o = hexToOklch(color);
  const bgL = hexToOklch(bg).l;
  const dir = bgL < 0.5 ? 1 : -1;
  for (let l = o.l; l >= 0 && l <= 1; l += dir * 0.005) {
    const hex = oklchToHex({ ...o, l });
    if (contrast(hex, bg) >= min) return hex;
  }
  // Unreachable target at this hue: fall back to the extreme.
  return dir > 0 ? "#ffffff" : "#000000";
}

/** Shift lightness of a hex by `dl` in OKLCH. */
export function shiftL(hex: Hex, dl: number): Hex {
  const o = hexToOklch(hex);
  return oklchToHex({ ...o, l: clamp(o.l + dl) });
}

/** Perceptual distance between two colors (Euclidean in OKLab). ~0.02 is just noticeable. */
export function colorDistance(a: Hex, b: Hex): number {
  const lab = (hex: Hex) => {
    const o = hexToOklch(hex);
    const r = (o.h * Math.PI) / 180;
    return [o.l, o.c * Math.cos(r), o.c * Math.sin(r)];
  };
  const A = lab(a);
  const B = lab(b);
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}

/** Mix two colors in sRGB; t=0 -> a, t=1 -> b */
export function mix(a: Hex, b: Hex, t: number): Hex {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}

/** Append alpha (0..1) as 8-digit hex, the format VS Code accepts. */
export function withAlpha(hex: Hex, alpha: number): string {
  return (
    hex +
    Math.round(clamp(alpha) * 255)
      .toString(16)
      .padStart(2, "0")
  );
}

/** Text color (near-black or white) readable on top of `bg`. */
export function onColor(bg: Hex): Hex {
  return contrast(bg, "#ffffff") >= contrast(bg, "#111418") ? "#ffffff" : "#111418";
}
