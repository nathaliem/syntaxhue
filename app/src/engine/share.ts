import { isHex } from "./color";
import { ROLE_IDS, THEME_VERSION, type FontStyle, type ThemeState } from "./theme";

/**
 * Share links carry the theme in the URL hash: `#t=<link>`.
 *
 * Current format: "p" + base64url of a small binary payload, about 100 characters for a typical theme.
 * (lz-string was measured first and made links longer: hex colors are close to random, so they don't
 * compress, while packing them as bytes saves a third.)
 *
 *   byte 0        THEME_VERSION the payload was made with (links from another version are refused)
 *   byte 1        flags: bit 0 = light mode. Bit 1 is reserved for vibe values (HP-205), which will
 *                 follow the styles as extra bytes when that bit is set. Other bits must be 0.
 *   bytes 2-3     locks: bit i set = role i (ROLE_IDS order) is locked
 *   next 8 bytes  font styles, one nibble per role: 1 italic, 2 bold, 4 underline
 *   next 45 bytes colors, 3 bytes (r, g, b) per role
 *   rest          theme name, UTF-8
 *
 * Legacy format, still readable: "1.<d|l>.<name>.<hex hex ...>.<styles>" (no locks).
 */

const STYLE_BITS: [FontStyle, number][] = [
  ["italic", 1],
  ["bold", 2],
  ["underline", 4],
];
const FLAG_LIGHT = 1;
const FLAGS_KNOWN = FLAG_LIGHT;
const N = ROLE_IDS.length;
const STYLE_BYTES = Math.ceil(N / 2);
const FIXED = 1 + 1 + 2 + STYLE_BYTES + N * 3;
const NAME_MAX = 60;

if (N > 16) throw new Error("Share links store locks in 16 bits; extend the format before adding more roles.");

// ---------- encode ----------

export function encodeTheme(t: ThemeState): string {
  const name = new TextEncoder().encode(t.name.slice(0, NAME_MAX));
  const bytes = new Uint8Array(FIXED + name.length);
  bytes[0] = THEME_VERSION;
  bytes[1] = t.mode === "light" ? FLAG_LIGHT : 0;
  let locks = 0;
  ROLE_IDS.forEach((id, i) => {
    const r = t.roles[id];
    if (r.locked) locks |= 1 << i;
    const nibble = STYLE_BITS.reduce((acc, [style, bit]) => acc | (r.fontStyle.includes(style) ? bit : 0), 0);
    bytes[4 + (i >> 1)] |= i % 2 === 0 ? nibble : nibble << 4;
    const rgb = parseInt(r.color.slice(1), 16);
    const at = 4 + STYLE_BYTES + i * 3;
    bytes[at] = (rgb >> 16) & 255;
    bytes[at + 1] = (rgb >> 8) & 255;
    bytes[at + 2] = rgb & 255;
  });
  bytes[2] = locks & 255;
  bytes[3] = locks >> 8;
  bytes.set(name, FIXED);
  return "p" + toBase64Url(bytes);
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array | null {
  try {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

// ---------- decode ----------

/** Reads any share link we have ever made. Null for anything we can't or won't read. */
export function decodeTheme(s: string): ThemeState | null {
  if (/^p[A-Za-z0-9_-]+$/.test(s)) return decodeBinary(s.slice(1));
  return decodeLegacy(s);
}

function decodeBinary(payload: string): ThemeState | null {
  const bytes = fromBase64Url(payload);
  // Links from another version of the saved shape (or with unknown flags) are refused, not guessed at.
  if (!bytes || bytes.length < FIXED || bytes[0] !== THEME_VERSION || bytes[1] & ~FLAGS_KNOWN) return null;
  let name: string;
  try {
    name = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(FIXED)).slice(0, NAME_MAX);
  } catch {
    return null;
  }
  const locks = bytes[2] | (bytes[3] << 8);
  const roles = {} as ThemeState["roles"];
  ROLE_IDS.forEach((id, i) => {
    const nibble = (bytes[4 + (i >> 1)] >> (i % 2 === 0 ? 0 : 4)) & 15;
    const at = 4 + STYLE_BYTES + i * 3;
    const rgb = (bytes[at] << 16) | (bytes[at + 1] << 8) | bytes[at + 2];
    roles[id] = {
      color: "#" + rgb.toString(16).padStart(6, "0"),
      locked: (locks & (1 << i)) !== 0,
      fontStyle: STYLE_BITS.filter(([, bit]) => nibble & bit).map(([style]) => style),
    };
  });
  return { version: THEME_VERSION, name, mode: bytes[1] & FLAG_LIGHT ? "light" : "dark", roles };
}

/** Links made before binary links existed: "1.<mode>.<name>.<hex...>.<styles>". They carry no locks. */
function decodeLegacy(s: string): ThemeState | null {
  const parts = s.split(".");
  if (parts.length < 5 || parts[0] !== "1") return null;
  // Read fixed fields from both ends, so links made before dots were escaped still open.
  const m = parts[1];
  const rawName = parts.slice(2, -2).join(".");
  const [colors, styles] = parts.slice(-2);
  if (colors.length !== N * 6) return null;
  const styleList = styles.split(",");
  if (styleList.length !== N) return null;
  let name: string;
  try {
    name = decodeURIComponent(rawName).slice(0, NAME_MAX);
  } catch {
    return null;
  }
  const roles = {} as ThemeState["roles"];
  for (let i = 0; i < N; i++) {
    const color = "#" + colors.slice(i * 6, i * 6 + 6).toLowerCase();
    if (!isHex(color)) return null;
    const st = styleList[i];
    const fontStyle: FontStyle[] = [];
    if (st.includes("i")) fontStyle.push("italic");
    if (st.includes("b")) fontStyle.push("bold");
    if (st.includes("u")) fontStyle.push("underline");
    roles[ROLE_IDS[i]] = { color, locked: false, fontStyle };
  }
  return { version: THEME_VERSION, name, mode: m === "l" ? "light" : "dark", roles };
}
