import { normalizeHex, oklchToHexInGamut, rgbToHex, type Hex } from "./color";

/**
 * Reads a pasted CSS color and returns "#rrggbb", or null if it isn't one we understand.
 *
 * Supports hex (3, 4, 6 or 8 digits, with or without "#"), rgb()/rgba(), hsl()/hsla() and oklch(),
 * in comma or space syntax, with an optional alpha. Alpha is ignored: themes are opaque colors here.
 * Out-of-gamut oklch() values are brought into sRGB by lowering chroma, so hue and lightness stay put.
 */
export function parseCssColor(input: string): Hex | null {
  const text = input.trim();
  if (!text) return null;

  const hex = parseHex(text);
  if (hex) return hex;

  const fn = text.match(/^(rgba?|hsla?|oklch)\(\s*([^()]*?)\s*\)$/i);
  if (!fn) return null;
  const name = fn[1].toLowerCase();
  const args = splitArgs(fn[2]);
  if (!args) return null;

  if (name.startsWith("rgb")) return parseRgb(args);
  if (name.startsWith("hsl")) return parseHsl(args);
  return parseOklch(args);
}

function parseHex(text: string): Hex | null {
  const body = text.startsWith("#") ? text.slice(1) : text;
  if (/^[0-9a-f]{4}$/i.test(body)) return normalizeHex(body.slice(0, 3));
  if (/^[0-9a-f]{8}$/i.test(body)) return normalizeHex(body.slice(0, 6));
  return normalizeHex(text);
}

/** Splits "a, b, c / d" or "a b c / d" into three color parts; validates and drops the alpha. */
function splitArgs(inner: string): string[] | null {
  let parts: string[];
  let alpha: string | undefined;
  if (inner.includes(",")) {
    if (inner.includes("/")) return null; // can't mix the two syntaxes
    parts = inner.split(",").map((p) => p.trim());
    if (parts.length === 4) alpha = parts.pop();
  } else {
    const [main, a, ...extra] = inner.split("/");
    if (extra.length) return null;
    parts = main.trim().split(/\s+/);
    alpha = a?.trim();
    if (a !== undefined && !alpha) return null;
  }
  if (parts.length !== 3 || parts.some((p) => !p)) return null;
  if (alpha !== undefined && parseNumber(alpha) === null) return null;
  return parts;
}

interface Num {
  value: number;
  percent: boolean;
}

const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

/** A number, or a number with %. "none" counts as 0, as in CSS. */
function parseNumber(token: string): Num | null {
  const t = token.toLowerCase();
  if (t === "none") return { value: 0, percent: false };
  const percent = t.endsWith("%");
  const raw = percent ? t.slice(0, -1) : t;
  if (!NUMBER.test(raw)) return null;
  return { value: Number(raw), percent };
}

/** An angle in degrees. Plain numbers are degrees; deg, grad, rad and turn units are converted. */
function parseAngle(token: string): number | null {
  const t = token.toLowerCase();
  if (t === "none") return 0;
  const m = t.match(/^(.+?)(deg|grad|rad|turn)?$/);
  if (!m || !NUMBER.test(m[1])) return null;
  const v = Number(m[1]);
  const deg = { deg: v, grad: v * 0.9, rad: (v * 180) / Math.PI, turn: v * 360 }[m[2] ?? "deg"] as number;
  return ((deg % 360) + 360) % 360;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

function parseRgb(args: string[]): Hex | null {
  const ch = args.map(parseNumber);
  if (ch.some((c) => c === null)) return null;
  const [r, g, b] = (ch as Num[]).map((c) => clamp(c.percent ? (c.value / 100) * 255 : c.value, 0, 255));
  return rgbToHex(r, g, b);
}

function parseHsl(args: string[]): Hex | null {
  const h = parseAngle(args[0]);
  const s = parseNumber(args[1]);
  const l = parseNumber(args[2]);
  if (h === null || !s || !l) return null;
  const sat = clamp(s.value, 0, 100) / 100;
  const light = clamp(l.value, 0, 100) / 100;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

function parseOklch(args: string[]): Hex | null {
  const l = parseNumber(args[0]);
  const c = parseNumber(args[1]);
  const h = parseAngle(args[2]);
  if (!l || !c || h === null) return null;
  const lightness = clamp(l.percent ? l.value / 100 : l.value, 0, 1);
  const chroma = Math.max(0, c.percent ? (c.value / 100) * 0.4 : c.value);
  return oklchToHexInGamut({ l: lightness, c: chroma, h });
}
