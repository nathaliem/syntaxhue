import { colorDistance, contrast, fixContrast, hexToOklch, oklchToHex, oklchToHexInGamut, type Hex } from "./color";
import { mulberry32 } from "./rng";
import { suggestNames } from "./themeName";

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
  /** Set once the user has set this color by hand. Vibe leaves such a color exactly as picked. */
  picked?: boolean;
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
export { mulberry32 };

const HARMONIES = {
  analogous: [0, 30, 60, -30, 90, -60],
  complementary: [0, 180, 30, 210, -30, 150],
  triadic: [0, 120, 240, 30, 150, 270],
  split: [0, 150, 210, 40, 180, -40],
  // One hue with a small wobble; the colors are told apart by lightness and chroma instead.
  monochrome: [0, 10, -10, 18, -18, 6],
};

export type HarmonyName = keyof typeof HARMONIES;
/** "auto" lets each shuffle pick one of the four multi-hue harmonies. Monochrome is only used when asked for. */
export type Harmony = "auto" | HarmonyName;
export const HARMONY_NAMES = Object.keys(HARMONIES) as HarmonyName[];
const AUTO_HARMONIES: HarmonyName[] = ["analogous", "complementary", "triadic", "split"];

/**
 * Per-harmony tuning. Hues close together (analogous) need more lightness spread and chroma to stay readable as
 * separate colors; hues far apart (triadic) already separate and look garish when pushed.
 */
const TUNING: Record<HarmonyName, { chroma: number; lightJitter: number }> = {
  analogous: { chroma: 1.2, lightJitter: 0.075 },
  complementary: { chroma: 1.05, lightJitter: 0.06 },
  triadic: { chroma: 0.95, lightJitter: 0.05 },
  split: { chroma: 1, lightJitter: 0.06 },
  monochrome: { chroma: 1, lightJitter: 0 },
};

const DEFAULT_STYLE: Partial<Record<RoleId, FontStyle[]>> = { keyword: ["italic"], muted: ["italic"] };

export const SYNTAX_IDS = ["keyword", "string", "function", "type", "variable", "constant", "operator"] as const;

/** Two syntax colors closer than this (OKLab distance) are hard to tell apart in code. */
export const MIN_SYNTAX_DISTANCE = 0.06;
/** Syntax colors closer than this to the error color make normal code look like an error. */
export const MIN_ERROR_DISTANCE = 0.08;
const MAX_ATTEMPTS = 120;
/** A generated theme is only accepted early when its syntax colors clear the minimums by this factor. */
export const QUALITY_DISTINCTNESS = 1.4;
const QUALITY_ATTEMPTS = 40;

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
export function generate(seed: number, mode: Mode, prev?: ThemeState, harmony: Harmony = "auto"): ThemeState {
  let best: ThemeState | null = null;
  let bestScore = -1;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const t = generateOnce((seed + attempt * 0x9e3779b1) >>> 0, mode, prev, harmony);
    const score = distinctness(t);
    // Aim high for a while, then settle for less, down to the hard minimum (some harmonies, like light monochrome, rarely reach the aim).
    if (score >= (attempt < QUALITY_ATTEMPTS ? QUALITY_DISTINCTNESS : attempt < 2 * QUALITY_ATTEMPTS ? 1.15 : 1))
      return t;
    if (score > bestScore) {
      best = t;
      bestScore = score;
    }
  }
  return best!;
}

/** The lightness band syntax colors live in for each mode; the same "prominence" maps between the two. */
const SYNTAX_BAND: Record<Mode, readonly [number, number]> = { dark: [0.6, 0.92], light: [0.3, 0.56] };
const CARRIED_ROLES: ReadonlySet<RoleId> = new Set([...SYNTAX_IDS, "error"]);

/**
 * The lightness a locked color takes after a mode switch. Syntax colors keep their rank: the one that stood out
 * most from the background before (lightest in a dark theme, darkest in a light one) still does, and the gaps between
 * colors shrink or grow with the band, so several locked colors don't collapse onto one lightness. Other roles take
 * the lightness their role needs in the new mode.
 */
function carriedLightness(id: RoleId, oldL: number, oldMode: Mode, newMode: Mode, roleL: number): number {
  if (!CARRIED_ROLES.has(id)) return roleL;
  const [oLo, oHi] = SYNTAX_BAND[oldMode];
  const [nLo, nHi] = SYNTAX_BAND[newMode];
  const prominence = oldMode === "dark" ? (oldL - oLo) / (oHi - oLo) : (oHi - oldL) / (oHi - oLo);
  const l = newMode === "dark" ? nLo + prominence * (nHi - nLo) : nHi - prominence * (nHi - nLo);
  return Math.min(0.97, Math.max(0.05, l));
}

/**
 * After a mode switch, two locked colors can end up too close even though they were apart before (the new mode has less
 * room at their hue). The shuffle loop can't help, since it ignores pairs where both are locked, so the quieter color of
 * each close pair is moved in lightness, away from the other and within its contrast minimum.
 */
function separateCarried(roles: Record<RoleId, RoleState>, bg: Hex) {
  const pairs: [RoleId, RoleId, number][] = [];
  for (let i = 0; i < SYNTAX_IDS.length; i++) {
    for (let j = i + 1; j < SYNTAX_IDS.length; j++) pairs.push([SYNTAX_IDS[i], SYNTAX_IDS[j], MIN_SYNTAX_DISTANCE]);
    pairs.push([SYNTAX_IDS[i], "error", MIN_ERROR_DISTANCE]);
  }
  const close = () =>
    pairs
      .filter(([a, b]) => roles[a].locked && roles[b].locked)
      .map(([a, b, min]) => ({ a, b, gap: colorDistance(roles[a].color, roles[b].color) / min }))
      .filter((p) => p.gap < 1.1)
      .sort((x, y) => x.gap - y.gap)[0];
  for (let step = 0; step < 16; step++) {
    const worst = close();
    if (!worst) return;
    const oa = hexToOklch(roles[worst.a].color);
    const ob = hexToOklch(roles[worst.b].color);
    // Error keeps its place; otherwise the lower-chroma color moves.
    const [moveId, move, other] = worst.b === "error" || oa.c > ob.c ? [worst.b, ob, oa] : [worst.a, oa, ob];
    if (moveId === "error") continue;
    const away = move.l >= other.l ? 1 : -1;
    const min = ROLE_BY_ID[moveId].min;
    for (const dir of [away, -away]) {
      const color = fixContrast(
        oklchToHexInGamut({ ...move, l: Math.min(0.97, Math.max(0.05, move.l + dir * 0.03)) }),
        bg,
        min,
      );
      if (color !== roles[moveId].color) {
        roles[moveId] = { ...roles[moveId], color };
        break;
      }
    }
  }
}

function generateOnce(seed: number, mode: Mode, prev: ThemeState | undefined, harmony: Harmony): ThemeState {
  const r = mulberry32(seed);
  const rnd = (a: number, b: number) => a + r() * (b - a);
  const dark = mode === "dark";
  const sameMode = prev?.mode === mode;
  const locked = (id: RoleId) => (prev?.roles[id].locked ? prev.roles[id] : null);

  const base = rnd(0, 360);
  // Always draw, so choosing a harmony never shifts the rest of the random stream.
  const auto = AUTO_HARMONIES[Math.floor(r() * 4)];
  const harmonyName = harmony === "auto" ? auto : harmony;
  const harm = HARMONIES[harmonyName];
  const mono = harmonyName === "monochrome";
  const tune = TUNING[harmonyName];
  const sat = rnd(0.08, 0.17) * tune.chroma;
  const hues = harm.map((o) => (base + o + rnd(-12, 12) * (mono ? 0.3 : 1) + 360) % 360);

  let bg: Hex;
  const bgLocked = locked("bg");
  if (bgLocked && sameMode) bg = bgLocked.color;
  else if (bgLocked) {
    // Mode switch: keep the background's hue and a hint of its chroma, flip its lightness.
    const o = hexToOklch(bgLocked.color);
    bg = oklchToHex({ l: dark ? 0.21 : 0.975, c: Math.min(o.c, dark ? 0.04 : 0.02), h: o.h });
  } else bg = oklchToHex({ l: dark ? rnd(0.17, 0.25) : rnd(0.96, 0.99), c: rnd(0.008, dark ? 0.04 : 0.02), h: base });
  const syntaxL = dark ? rnd(0.74, 0.84) : rnd(0.45, 0.55);

  // In one hue the five accent colors can only differ by lightness and chroma, so they take evenly spaced steps.
  const accentL = (i: number) =>
    mono
      ? (dark ? syntaxL + 0.03 - i * 0.055 : syntaxL - 0.13 + i * 0.065) + rnd(-0.01, 0.01)
      : syntaxL + rnd(-tune.lightJitter, tune.lightJitter);
  const accentC = (i: number) => (mono ? sat * [1.3, 0.7, 1.15, 0.55, 0.95][i] * rnd(0.9, 1.1) : sat * rnd(0.8, 1.2));

  const want: Record<Exclude<RoleId, "bg">, () => Hex> = {
    fg: () => oklchToHex({ l: dark ? 0.9 : 0.28, c: 0.015, h: base }),
    muted: () => oklchToHex({ l: dark ? 0.58 : 0.6, c: 0.03, h: base }),
    accent: () => oklchToHex({ l: dark ? 0.72 : 0.52, c: sat * 1.1, h: (hues[0] + 200) % 360 }),
    keyword: () => oklchToHex({ l: accentL(0), c: accentC(0), h: hues[1] }),
    string: () => oklchToHex({ l: accentL(1), c: accentC(1), h: hues[2] }),
    function: () => oklchToHex({ l: accentL(2), c: accentC(2), h: hues[3] }),
    type: () => oklchToHex({ l: accentL(3), c: accentC(3), h: hues[4] }),
    constant: () => oklchToHex({ l: accentL(4), c: accentC(4), h: hues[5] }),
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
      color = oklchToHexInGamut({
        l: carriedLightness(def.id, o.l, prev!.mode, mode, hexToOklch(raw).l),
        c: o.c,
        h: o.h,
      });
    }
    roles[def.id] = { color: def.min ? fixContrast(color, bg, def.min) : color, locked: !!kept, fontStyle };
  }

  if (prev && !sameMode) separateCarried(roles, bg);

  const vibe = { ...(prev?.vibe ?? ZERO_VIBE) };
  // A fresh theme gets a name that fits its palette (its own random stream, so the colors don't depend on it).
  const name =
    prev && ROLE_IDS.every((id) => prev.roles[id].locked)
      ? prev.name
      : suggestNames({ version: THEME_VERSION, name: "", mode, roles, vibe }, seed, 1)[0];

  // Vibe is the user's setting for how the theme feels, so a shuffle or mode switch keeps it.
  return { version: THEME_VERSION, name, mode, roles, vibe };
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
