import { hexToOklch, type Hex } from "./color";

/** OKLCH hue angle (degrees) to a plain color word. Boundaries follow where the hues look different in OKLCH. */
export function hueName(h: number): string {
  const x = ((h % 360) + 360) % 360;
  if (x < 15 || x >= 350) return "pink-red";
  if (x < 45) return "red";
  if (x < 75) return "orange";
  if (x < 110) return "yellow";
  if (x < 165) return "green";
  if (x < 200) return "teal";
  if (x < 240) return "cyan-blue";
  if (x < 275) return "blue";
  if (x < 335) return "purple";
  if (x < 350) return "magenta";
  return "red";
}

/** A word for how light a color is; medium is left out of names because it adds nothing. */
export function lightnessWord(l: number): string {
  if (l < 0.25) return "very dark";
  if (l < 0.45) return "dark";
  if (l < 0.65) return "medium";
  if (l < 0.85) return "light";
  return "very light";
}

/** A word for how colorful a color is, from OKLCH chroma. */
export function chromaWord(c: number): string {
  if (c < 0.02) return "grey";
  if (c < 0.05) return "muted";
  if (c < 0.12) return "soft";
  if (c < 0.2) return "rich";
  return "vivid";
}

/**
 * A color in words for people who can't see it: "dark blue-grey", "light orange", "vivid purple", "near black".
 * Approximate on purpose; the hex is still given next to it.
 */
export function describeColor(hex: Hex): string {
  const { l, c, h } = hexToOklch(hex);
  if (l < 0.12) return "near black";
  if (l > 0.97 && c < 0.03) return "near white";
  const light = lightnessWord(l);
  const lead = light === "medium" ? "" : `${light} `;
  if (c < 0.015) return `${lead}grey`.trim();
  const hue = hueName(h);
  if (c < 0.05) return `${lead}${hue}-grey`;
  if (c >= 0.2) return `${lead}vivid ${hue}`;
  return `${lead}${hue}`;
}

/** What a screen reader says for a color row: name, color in words, hex, contrast and lock state. */
export function roleSpeech(
  label: string,
  hex: Hex,
  locked: boolean,
  ratio: number | null,
  min: number,
  lc?: number,
): string {
  const parts = [label, describeColor(hex), hex];
  if (ratio !== null) {
    parts.push(`contrast ${ratio.toFixed(1)} to 1, ${ratio < min ? `below the ${min} to 1 minimum` : "readable"}`);
    if (lc !== undefined) parts.push(`A P C A ${Math.round(lc)}`);
  }
  if (locked) parts.push("locked");
  return parts.join(", ");
}
