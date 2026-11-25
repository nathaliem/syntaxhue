import { hexToOklch } from "./color";
import { hueName } from "./colorName";
import { mulberry32 } from "./rng";
import type { ThemeState } from "./theme";

/**
 * Theme name suggestions that fit the palette: the main accent colors pick the color words, the mode and how vivid
 * the colors are pick the mood and the setting. Same theme and same seed give the same list; a new seed gives new names.
 */

const COLOR_WORDS: Record<string, string[]> = {
  "pink-red": ["Rose", "Coral", "Blush", "Peony", "Camellia", "Salmon"],
  red: ["Ember", "Garnet", "Poppy", "Cinnabar", "Rust", "Cherry"],
  orange: ["Amber", "Copper", "Saffron", "Marmalade", "Clay", "Tangerine"],
  yellow: ["Honey", "Citrine", "Brass", "Straw", "Marigold", "Butter"],
  green: ["Moss", "Juniper", "Fern", "Sage", "Pine", "Meadow"],
  teal: ["Lagoon", "Verdigris", "Reef", "Jade", "Spruce", "Kelp"],
  "cyan-blue": ["Glacier", "Tide", "Harbor", "Frost", "Cyan", "Sky"],
  blue: ["Cobalt", "Indigo", "Denim", "Ink", "Sapphire", "Azure"],
  purple: ["Violet", "Plum", "Iris", "Amethyst", "Lilac", "Heather"],
  magenta: ["Orchid", "Mulberry", "Fuchsia", "Berry", "Dahlia", "Magenta"],
};

const MOODS = {
  darkVivid: ["Neon", "Electric", "Static", "Signal", "Synth", "Laser"],
  darkMuted: ["Quiet", "Velvet", "Hush", "Smoke", "Soft", "Slate"],
  lightVivid: ["Bright", "Sunlit", "Bloom", "Fresh", "Pop", "Zest"],
  lightMuted: ["Paper", "Linen", "Chalk", "Pale", "Gentle", "Soft"],
};

const SETTINGS = {
  dark: ["Night", "Midnight", "Dusk", "Hollow", "Lantern", "Circuit", "Nebula", "Harbor", "Eclipse", "Afterglow"],
  light: ["Morning", "Daylight", "Garden", "Orchard", "Studio", "Terrace", "Atlas", "Meadow", "Noon", "Porcelain"],
};

const pick = <T>(list: T[], r: () => number): T => list[Math.floor(r() * list.length)];

/** The color families of the palette's accents, strongest first, each family once. */
export function paletteFamilies(theme: ThemeState): string[] {
  const ids = ["keyword", "string", "function", "type", "constant", "variable"] as const;
  const scored = ids.map((id) => {
    const o = hexToOklch(theme.roles[id].color);
    return { family: hueName(o.h), c: o.c };
  });
  scored.sort((a, b) => b.c - a.c);
  return [...new Set(scored.filter((s) => s.c >= 0.03).map((s) => s.family))];
}

/** Average chroma of the accents: how vivid the palette is. */
function vividness(theme: ThemeState): number {
  const ids = ["keyword", "string", "function", "type"] as const;
  return ids.reduce((sum, id) => sum + hexToOklch(theme.roles[id].color).c, 0) / ids.length;
}

export function suggestNames(theme: ThemeState, seed: number, count = 6): string[] {
  const r = mulberry32(seed);
  const families = paletteFamilies(theme);
  const main = families[0] ?? "blue";
  const second = families[1] ?? main;
  const vivid = vividness(theme) >= 0.13;
  const moods = MOODS[`${theme.mode}${vivid ? "Vivid" : "Muted"}` as keyof typeof MOODS];
  const colors = (family: string) => COLOR_WORDS[family] ?? COLOR_WORDS.blue;
  const makers = [
    () => `${pick(colors(main), r)} ${pick(SETTINGS[theme.mode], r)}`,
    () => `${pick(moods, r)} ${pick(colors(main), r)}`,
    () => `${pick(colors(main), r)} & ${pick(colors(second), r)}`,
    () => `${pick(moods, r)} ${pick(SETTINGS[theme.mode], r)}`,
    () => `${pick(colors(second), r)} ${pick(SETTINGS[theme.mode], r)}`,
  ];
  const out = new Set<string>();
  for (let i = 0; out.size < count && i < count * 20; i++) {
    const name = makers[i % makers.length]();
    const [a, b] = name.split(/ & | /);
    if (a !== b) out.add(name);
  }
  return [...out];
}
