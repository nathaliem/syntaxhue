import type { VibeKey } from "../engine/theme";

export const SLIDERS: Record<VibeKey, { name: string; low: string; high: string }> = {
  contrast: { name: "Contrast", low: "Soft", high: "Crisp" },
  saturation: { name: "Saturation", low: "Muted", high: "Vivid" },
  warmth: { name: "Warmth", low: "Cool", high: "Warm" },
  depth: { name: "Depth", low: "Flat", high: "Layered" },
};

/** "+35", "-20" or "0": the slider position as a whole number. */
export const formatVibe = (v: number) => (v === 0 ? "0" : `${v > 0 ? "+" : "-"}${Math.round(Math.abs(v) * 100)}`);

/** Spoken value for screen readers: "35 percent toward Crisp", "Off". */
export const vibeValueText = (key: VibeKey, v: number) =>
  v === 0 ? "Off" : `${Math.round(Math.abs(v) * 100)} percent toward ${v > 0 ? SLIDERS[key].high : SLIDERS[key].low}`;
