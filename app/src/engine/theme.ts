import { colorDistance, contrast, fixContrast, hexToOklch, oklchToHex, oklchToHexInGamut, type Hex } from "./color";

export type Mode = "dark" | "light";
export type FontStyle = "italic" | "bold" | "underline";

export const ROLE_IDS = [
  "bg",
  "fg",
  "accent",
  "muted",
  "keyword",
  "string",
  "function",
  "type",
  "variable",
  "constant",
  "operator",
  "error",
  "warning",
  "info",
  "success",
] as const;
export type RoleId = (typeof ROLE_IDS)[number];

export interface RoleDef {
  id: RoleId;
  label: string;
  group: "Base" | "Syntax" | "Status";
  /** Minimum WCAG contrast against bg. bg itself has none. */
  min: number;
  hint: string;
  styleable?: boolean;
}

export const ROLES: RoleDef[] = [
  {
    id: "bg",
    label: "Background",
    group: "Base",
    min: 0,
    hint: "Editor background. Sidebar, tabs and panels are derived from it.",
  },
  { id: "fg", label: "Text", group: "Base", min: 7, hint: "Default text in the editor and UI." },
  {
    id: "accent",
    label: "Accent",
    group: "Base",
    min: 3,
    hint: "Focus borders, active tab, status bar, buttons, badges.",
  },
  {
    id: "muted",
    label: "Comments",
    group: "Base",
    min: 3,
    hint: "Comments, line numbers, inactive tabs and secondary text.",
    styleable: true,
  },
  {
    id: "keyword",
    label: "Keyword",
    group: "Syntax",
    min: 4.5,
    hint: "import, const, if, return, function…",
    styleable: true,
  },
  {
    id: "string",
    label: "String",
    group: "Syntax",
    min: 4.5,
    hint: "Strings and regular expressions.",
    styleable: true,
  },
  { id: "function", label: "Function", group: "Syntax", min: 4.5, hint: "Function and method names.", styleable: true },
  { id: "type", label: "Type", group: "Syntax", min: 4.5, hint: "Types, classes and interfaces.", styleable: true },
  {
    id: "variable",
    label: "Variable",
    group: "Syntax",
    min: 4.5,
    hint: "Variables, parameters and properties.",
    styleable: true,
  },
  {
    id: "constant",
    label: "Number",
    group: "Syntax",
    min: 4.5,
    hint: "Numbers, booleans and constants.",
    styleable: true,
  },
  { id: "operator", label: "Operator", group: "Syntax", min: 4.5, hint: "Operators and punctuation.", styleable: true },
  { id: "error", label: "Error", group: "Status", min: 4.5, hint: "Error squiggles, deleted files, failing tests." },
  { id: "warning", label: "Warning", group: "Status", min: 4.5, hint: "Warnings and modified files." },
  { id: "info", label: "Info", group: "Status", min: 4.5, hint: "Info diagnostics and hints." },
  { id: "success", label: "Success", group: "Status", min: 4.5, hint: "Added files and passing states." },
];

export const ROLE_BY_ID = Object.fromEntries(ROLES.map((r) => [r.id, r])) as Record<RoleId, RoleDef>;

/** How many roles a shuffle would change. */
export function unlockedCount(theme: ThemeState): number {
  return ROLES.filter((r) => !theme.roles[r.id].locked).length;
}

/** Text for the shuffle button: "Shuffle 11 colors", "Shuffle 1 color" or "All colors locked". */
export function shuffleLabel(unlocked: number): string {
  if (unlocked === 0) return "All colors locked";
  return `Shuffle ${unlocked} color${unlocked === 1 ? "" : "s"}`;
}

export interface RoleState {
  color: Hex;
  locked: boolean;
  fontStyle: FontStyle[];
}

/** Bump when the saved shape of ThemeState changes, and add a migration in schema.ts. */
export const THEME_VERSION = 2;

/** Global "vibe" sliders, each -1..1 with 0 = no change. Applied on top of the roles, never stored in them. */
export const VIBE_KEYS = ["contrast", "saturation", "warmth", "depth"] as const;
export type VibeKey = (typeof VIBE_KEYS)[number];
export type Vibe = Record<VibeKey, number>;
export const ZERO_VIBE: Readonly<Vibe> = Object.freeze({ contrast: 0, saturation: 0, warmth: 0, depth: 0 });

export interface ThemeState {
  version: typeof THEME_VERSION;
  name: string;
  mode: Mode;
  roles: Record<RoleId, RoleState>;
  vibe: Vibe;
}

// ---------- random ----------
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HARMONIES: Record<string, number[]> = {
  analogous: [0, 30, 60, -30, 90, -60],
  complementary: [0, 180, 30, 210, -30, 150],
  triadic: [0, 120, 240, 30, 150, 270],
  split: [0, 150, 210, 40, 180, -40],
};

const ADJ = [
  "Quiet",
  "Ember",
  "Velvet",
  "Paper",
  "Neon",
  "Moss",
  "Harbor",
  "Dusk",
  "Frost",
  "Copper",
  "Lunar",
  "Saffron",
  "Cobalt",
  "Juniper",
  "Static",
  "Amber",
];
const NOUN = [
  "Harbor",
  "Night",
  "Garden",
  "Signal",
  "Orchard",
  "Tide",
  "Grove",
  "Circuit",
  "Lantern",
  "Atlas",
  "Bloom",
  "Meadow",
  "Reef",
  "Quarry",
  "Comet",
  "Hollow",
];

const DEFAULT_STYLE: Partial<Record<RoleId, FontStyle[]>> = { keyword: ["italic"], muted: ["italic"] };

export const SYNTAX_IDS = ["keyword", "string", "function", "type", "variable", "constant", "operator"] as const;

/** Two syntax colors closer than this (OKLab distance) are hard to tell apart in code. */
export const MIN_SYNTAX_DISTANCE = 0.06;
/** Syntax colors closer than this to the error color make normal code look like an error. */
export const MIN_ERROR_DISTANCE = 0.08;
const MAX_ATTEMPTS = 40;

/**
 * How well a theme separates its syntax colors: 1 or more means it meets both minimums.
 * Pairs where both colors are locked are the user's choice and don't count.
 */
export function distinctness(t: ThemeState): number {
  let score = Infinity;
  for (let i = 0; i < SYNTAX_IDS.length; i++) {
    const a = t.roles[SYNTAX_IDS[i]];
    for (let j = i + 1; j < SYNTAX_IDS.length; j++) {
      const b = t.roles[SYNTAX_IDS[j]];
      if (a.locked && b.locked) continue;
      score = Math.min(score, colorDistance(a.color, b.color) / MIN_SYNTAX_DISTANCE);
    }
    if (!(a.locked && t.roles.error.locked)) {
      score = Math.min(score, colorDistance(a.color, t.roles.error.color) / MIN_ERROR_DISTANCE);
    }
  }
  return score;
}

/**
 * Generate a full theme. Locked roles in `prev` are kept: as-is in the same mode, or with their
 * hue and chroma carried into the other mode. All generated colors meet their role's minimum
 * contrast against bg, and syntax colors are kept apart from each other and from the error color.
 */
export function generate(seed: number, mode: Mode, prev?: ThemeState): ThemeState {
  let best: ThemeState | null = null;
  let bestScore = -1;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const t = generateOnce((seed + attempt * 0x9e3779b1) >>> 0, mode, prev);
    const score = distinctness(t);
    if (score >= 1) return t;
    if (score > bestScore) {
      best = t;
      bestScore = score;
    }
  }
  return best!;
}

function generateOnce(seed: number, mode: Mode, prev?: ThemeState): ThemeState {
  const r = mulberry32(seed);
  const rnd = (a: number, b: number) => a + r() * (b - a);
  const dark = mode === "dark";
  const sameMode = prev?.mode === mode;
  const locked = (id: RoleId) => (prev?.roles[id].locked ? prev.roles[id] : null);

  const base = rnd(0, 360);
  const harm = Object.values(HARMONIES)[Math.floor(r() * 4)];
  const sat = rnd(0.08, 0.17);
  const hues = harm.map((o) => (base + o + rnd(-12, 12) + 360) % 360);

  let bg: Hex;
  const bgLocked = locked("bg");
  if (bgLocked && sameMode) bg = bgLocked.color;
  else if (bgLocked) {
    // Mode switch: keep the background's hue and a hint of its chroma, flip its lightness.
    const o = hexToOklch(bgLocked.color);
    bg = oklchToHex({ l: dark ? 0.21 : 0.975, c: Math.min(o.c, dark ? 0.04 : 0.02), h: o.h });
  } else bg = oklchToHex({ l: dark ? rnd(0.17, 0.25) : rnd(0.96, 0.99), c: rnd(0.008, dark ? 0.04 : 0.02), h: base });
  const syntaxL = dark ? rnd(0.74, 0.84) : rnd(0.45, 0.55);

  const want: Record<Exclude<RoleId, "bg">, () => Hex> = {
    fg: () => oklchToHex({ l: dark ? 0.9 : 0.28, c: 0.015, h: base }),
    muted: () => oklchToHex({ l: dark ? 0.58 : 0.6, c: 0.03, h: base }),
    accent: () => oklchToHex({ l: dark ? 0.72 : 0.52, c: sat * 1.1, h: (hues[0] + 200) % 360 }),
    keyword: () => oklchToHex({ l: syntaxL + rnd(-0.04, 0.04), c: sat * rnd(0.8, 1.2), h: hues[1] }),
    string: () => oklchToHex({ l: syntaxL + rnd(-0.04, 0.04), c: sat * rnd(0.8, 1.2), h: hues[2] }),
    function: () => oklchToHex({ l: syntaxL + rnd(-0.04, 0.04), c: sat * rnd(0.8, 1.2), h: hues[3] }),
    type: () => oklchToHex({ l: syntaxL + rnd(-0.04, 0.04), c: sat * rnd(0.8, 1.2), h: hues[4] }),
    constant: () => oklchToHex({ l: syntaxL + rnd(-0.04, 0.04), c: sat * rnd(0.8, 1.2), h: hues[5] }),
    variable: () => oklchToHex({ l: dark ? 0.86 : 0.35, c: sat * 0.35, h: hues[0] }),
    operator: () => oklchToHex({ l: dark ? 0.78 : 0.42, c: 0.05, h: hues[1] }),
    error: () => oklchToHex({ l: dark ? 0.7 : 0.52, c: 0.17, h: 25 }),
    warning: () => oklchToHex({ l: dark ? 0.8 : 0.55, c: 0.14, h: 75 }),
    info: () => oklchToHex({ l: dark ? 0.75 : 0.5, c: 0.12, h: 240 }),
    success: () => oklchToHex({ l: dark ? 0.76 : 0.5, c: 0.14, h: 145 }),
  };

  const roles = {} as Record<RoleId, RoleState>;
  for (const def of ROLES) {
    const fontStyle = prev?.roles[def.id]?.fontStyle ?? DEFAULT_STYLE[def.id] ?? [];
    if (def.id === "bg") {
      roles.bg = { color: bg, locked: !!bgLocked, fontStyle };
      continue;
    }
    // Always draw from the random stream so locks don't shift the other roles' colors.
    const raw = want[def.id as Exclude<RoleId, "bg">]();
    const kept = locked(def.id);
    if (kept && sameMode) {
      roles[def.id] = { ...kept };
      continue;
    }
    let color = raw;
    if (kept) {
      // Mode switch: keep the locked hue and chroma, take the lightness this role needs in the new mode.
      const o = hexToOklch(kept.color);
      color = oklchToHexInGamut({ l: hexToOklch(raw).l, c: o.c, h: o.h });
    }
    roles[def.id] = { color: def.min ? fixContrast(color, bg, def.min) : color, locked: !!kept, fontStyle };
  }

  const name =
    prev && ROLE_IDS.every((id) => prev.roles[id].locked)
      ? prev.name
      : `${ADJ[Math.floor(r() * ADJ.length)]} ${NOUN[Math.floor(r() * NOUN.length)]}`;

  // Vibe is the user's setting for how the theme feels, so a shuffle or mode switch keeps it.
  return { version: THEME_VERSION, name, mode, roles, vibe: { ...(prev?.vibe ?? ZERO_VIBE) } };
}

export interface ContrastIssue {
  role: RoleId;
  ratio: number;
  min: number;
}

export function contrastIssues(t: ThemeState): ContrastIssue[] {
  const bg = t.roles.bg.color;
  return ROLES.filter((d) => d.min > 0)
    .map((d) => ({ role: d.id, ratio: contrast(t.roles[d.id].color, bg), min: d.min }))
    .filter((i) => i.ratio < i.min);
}
