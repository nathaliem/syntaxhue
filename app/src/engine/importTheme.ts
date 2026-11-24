import { contrast, fixContrast, hexToOklch, type Hex } from "./color";
import { validateTheme } from "./schema";
import {
  generate,
  ROLES,
  THEME_VERSION,
  ZERO_VIBE,
  type FontStyle,
  type Mode,
  type RoleId,
  type ThemeState,
} from "./theme";

/**
 * Turns an existing VS Code color theme (or a `settings.json` with color customizations) into a
 * `ThemeState`, so it can be edited like any other theme.
 *
 * The input is untrusted: it is only parsed as data, never evaluated, and read through `typeof`
 * checks. Everything runs in the browser.
 */

export interface ImportFile {
  name: string;
  text: string;
}

export type ImportOutcome = { ok: true; theme: ThemeState; notes: string[] } | { ok: false; error: string };

export const MAX_IMPORT_BYTES = 1_000_000;
const MAX_INCLUDE_DEPTH = 5;

// ---------- JSON with comments ----------

/** Parses JSON that may contain line and block comments and trailing commas, as VS Code themes do. */
export function parseJsonc(text: string): unknown {
  let out = "";
  let i = 0;
  const n = text.length;
  if (text.charCodeAt(0) === 0xfeff) i = 1;
  while (i < n) {
    const ch = text[i];
    if (ch === '"') {
      let j = i + 1;
      while (j < n && text[j] !== '"') j += text[j] === "\\" ? 2 : 1;
      out += text.slice(i, j + 1);
      i = j + 1;
    } else if (ch === "/" && text[i + 1] === "/") {
      while (i < n && text[i] !== "\n") i++;
    } else if (ch === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end === -1 ? n : end + 2;
    } else {
      out += ch;
      i++;
    }
  }
  // Trailing commas: a comma followed only by whitespace and a closing bracket (outside strings).
  let cleaned = "";
  for (let k = 0; k < out.length; k++) {
    const ch = out[k];
    if (ch === '"') {
      let j = k + 1;
      while (j < out.length && out[j] !== '"') j += out[j] === "\\" ? 2 : 1;
      cleaned += out.slice(k, j + 1);
      k = j;
    } else if (ch === ",") {
      let j = k + 1;
      while (j < out.length && /\s/.test(out[j])) j++;
      if (out[j] !== "}" && out[j] !== "]") cleaned += ch;
    } else {
      cleaned += ch;
    }
  }
  return JSON.parse(cleaned);
}

// ---------- reading a theme file ----------

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** `#rgb`, `#rrggbb`, `#rgba` or `#rrggbbaa` to `#rrggbb` (alpha is dropped). Anything else is null. */
function hexOf(v: unknown): Hex | null {
  if (typeof v !== "string") return null;
  const m = v.trim().match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (!m) return null;
  let h = m[1].toLowerCase();
  if (h.length <= 4) h = [...h].map((c) => c + c).join("");
  return "#" + h.slice(0, 6);
}

interface Rule {
  selectors: string[];
  foreground: Hex | null;
  fontStyle: string | null;
}

interface Source {
  name: string | null;
  type: unknown;
  colors: Map<string, Hex>;
  rules: Rule[];
  semantic: boolean;
  notes: string[];
}

const baseName = (path: string) => path.split(/[\\/]/).pop()!.toLowerCase();

function readRules(tokenColors: unknown): Rule[] {
  if (!Array.isArray(tokenColors)) return [];
  const rules: Rule[] = [];
  for (const item of tokenColors) {
    if (!isObject(item) || !isObject(item.settings)) continue;
    const scope = item.scope;
    const raw = typeof scope === "string" ? scope.split(",") : Array.isArray(scope) ? scope : [""];
    const selectors = raw.filter((s): s is string => typeof s === "string").map((s) => s.trim());
    rules.push({
      selectors: scope === undefined ? [""] : selectors,
      foreground: hexOf(item.settings.foreground),
      fontStyle: typeof item.settings.fontStyle === "string" ? item.settings.fontStyle : null,
    });
  }
  return rules;
}

function readColors(colors: unknown): Map<string, Hex> {
  const map = new Map<string, Hex>();
  if (!isObject(colors)) return map;
  for (const [k, v] of Object.entries(colors)) {
    const hex = hexOf(v);
    if (hex) map.set(k, hex);
  }
  return map;
}

/** `settings.json` keys that mean the same as a few TextMate scopes. */
const SIMPLE_TOKEN_KEYS: [string, string][] = [
  ["comments", "comment"],
  ["strings", "string"],
  ["keywords", "keyword"],
  ["numbers", "constant.numeric"],
  ["types", "entity.name.type"],
  ["functions", "entity.name.function"],
  ["variables", "variable"],
];

/** Color customizations may be flat or wrapped in "[Theme Name]" blocks; take the flat part, then the first block. */
function flatten(value: unknown): Record<string, unknown> {
  if (!isObject(value)) return {};
  const flat: Record<string, unknown> = {};
  let block: Record<string, unknown> | null = null;
  for (const [k, v] of Object.entries(value)) {
    if (k.startsWith("[") && isObject(v)) block ??= v;
    else flat[k] = v;
  }
  return block ? { ...block, ...flat } : flat;
}

function fromSettings(obj: Record<string, unknown>, fallbackName: string): Source {
  const colors = flatten(obj["workbench.colorCustomizations"]);
  const tokens = flatten(obj["editor.tokenColorCustomizations"]);
  const rules = readRules(tokens.textMateRules);
  for (const [key, scope] of SIMPLE_TOKEN_KEYS) {
    const v = tokens[key];
    const foreground = hexOf(isObject(v) ? v.foreground : v);
    if (foreground) rules.push({ selectors: [scope], foreground, fontStyle: null });
  }
  const theme = typeof obj["workbench.colorTheme"] === "string" ? obj["workbench.colorTheme"] : "";
  return {
    name: fallbackName,
    type: /light/i.test(theme) ? "light" : /dark/i.test(theme) ? "dark" : undefined,
    colors: readColors(colors),
    rules,
    semantic: false,
    notes: [],
  };
}

function load(files: ImportFile[], file: ImportFile, depth: number, seen: Set<string>): Source {
  const label = file.name || "theme";
  let parsed: unknown;
  try {
    parsed = parseJsonc(file.text);
  } catch {
    throw new Error(`${label} isn't valid JSON, so it can't be read as a theme.`);
  }
  if (!isObject(parsed)) throw new Error(`${label} isn't a theme file: expected a JSON object.`);

  const stem = label.replace(/\.[^.]*$/, "");
  const isSettings = "workbench.colorCustomizations" in parsed || "editor.tokenColorCustomizations" in parsed;
  if (isSettings) return fromSettings(parsed, stem);

  const own: Source = {
    name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : stem,
    type: parsed.type,
    colors: readColors(parsed.colors),
    rules: readRules(parsed.tokenColors),
    semantic: isObject(parsed.semanticTokenColors) && Object.keys(parsed.semanticTokenColors).length > 0,
    notes: [],
  };
  if (typeof parsed.tokenColors === "string") {
    own.notes.push(`${label} points to a separate .tmTheme file for its syntax colors, which can't be read here.`);
  }

  if (typeof parsed.include === "string") {
    const target = baseName(parsed.include);
    const parent = files.find((f) => baseName(f.name) === target);
    if (parent && depth < MAX_INCLUDE_DEPTH && !seen.has(target)) {
      const base = load(files, parent, depth + 1, new Set(seen).add(target));
      own.colors = new Map([...base.colors, ...own.colors]);
      own.rules = [...base.rules, ...own.rules];
      own.semantic ||= base.semantic;
      own.notes.push(...base.notes);
      own.type ??= base.type;
    } else {
      own.notes.push(
        `This theme extends ${target}, which wasn't added, so only the colors in ${label} were imported. ` +
          `Select both files together to include it.`,
      );
    }
  }
  return own;
}

// ---------- mapping onto roles ----------

/** Scope a role is probed with, most telling first. */
const PROBES: Partial<Record<RoleId, string[]>> = {
  muted: ["comment"],
  keyword: ["storage.type", "storage", "keyword", "keyword.control"],
  string: ["string.quoted", "string"],
  function: ["entity.name.function", "support.function", "meta.function-call"],
  type: ["entity.name.type", "entity.name.class", "support.type", "support.class"],
  variable: ["variable.other.readwrite", "variable", "variable.parameter"],
  constant: ["constant.numeric", "constant.language", "constant"],
  operator: ["keyword.operator", "punctuation"],
};

/** Workbench keys that carry a role's color, most telling first. */
const KEYS: Partial<Record<RoleId, string[]>> = {
  bg: ["editor.background"],
  fg: ["editor.foreground", "foreground"],
  accent: ["focusBorder", "button.background", "activityBarBadge.background", "statusBar.background"],
  muted: ["descriptionForeground", "editorLineNumber.foreground"],
  error: ["editorError.foreground", "errorForeground"],
  warning: ["editorWarning.foreground", "list.warningForeground"],
  info: ["editorInfo.foreground", "notificationsInfoIcon.foreground"],
  success: ["gitDecoration.addedResourceForeground", "terminal.ansiGreen", "testing.iconPassed"],
};

/** The rule VS Code would apply to a scope: the longest matching selector, later rules winning ties. */
function winner(rules: Rule[], target: string): Rule | null {
  let best: Rule | null = null;
  let bestLen = -1;
  for (const r of rules) {
    if (!r.foreground) continue;
    for (const s of r.selectors) {
      // Descendant selectors ("source.ts string") and exclusions ("a - b") need a scope stack, which we don't have.
      if (!s || /\s/.test(s)) continue;
      if ((target === s || target.startsWith(s + ".")) && s.length >= bestLen) {
        best = r;
        bestLen = s.length;
      }
    }
  }
  return best;
}

const fontStyles = (v: string | null): FontStyle[] =>
  (["italic", "bold", "underline"] as const).filter((s) => v?.split(/\s+/).includes(s));

function hash(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

function modeOf(type: unknown, bg: Hex | undefined): Mode {
  if (typeof type === "string") {
    if (type === "light" || type === "hc-light") return "light";
    if (type === "dark" || type === "hc" || type === "hc-black") return "dark";
  }
  return bg && hexToOklch(bg).l > 0.6 ? "light" : "dark";
}

/**
 * Imports one theme. Pass several files to resolve `include`: the one the others don't include is the theme.
 * Returns the theme as it is (no contrast fix is applied), plus notes on what was filled in or left out.
 */
export function importTheme(files: ImportFile[]): ImportOutcome {
  if (files.length === 0) return { ok: false, error: "Choose a theme file to import." };
  const big = files.find((f) => f.text.length > MAX_IMPORT_BYTES);
  if (big) return { ok: false, error: `${big.name || "That file"} is too large to be a color theme (over 1 MB).` };

  try {
    const included = new Set<string>();
    for (const f of files) {
      try {
        const p = parseJsonc(f.text);
        if (isObject(p) && typeof p.include === "string") included.add(baseName(p.include));
      } catch {
        /* reported below, for the file that is actually loaded */
      }
    }
    const main = files.find((f) => !included.has(baseName(f.name))) ?? files[0];
    const src = load(files, main, 0, new Set([baseName(main.name)]));

    if (src.colors.size === 0 && src.rules.length === 0) {
      return {
        ok: false,
        error: `${main.name || "That file"} has no colors or token colors, so it doesn't look like a VS Code color theme.`,
      };
    }

    const pick = (id: RoleId): { color: Hex; fontStyle: FontStyle[] } | null => {
      for (const probe of PROBES[id] ?? []) {
        const rule = winner(src.rules, probe);
        if (rule) return { color: rule.foreground!, fontStyle: fontStyles(rule.fontStyle) };
      }
      for (const key of KEYS[id] ?? []) {
        const c = src.colors.get(key);
        if (c) return { color: c, fontStyle: [] };
      }
      if (id === "fg") {
        const global = src.rules.filter((r) => r.selectors.includes("") && r.foreground).pop();
        if (global) return { color: global.foreground!, fontStyle: [] };
      }
      return null;
    };

    const found = Object.fromEntries(ROLES.map((r) => [r.id, pick(r.id)])) as Record<
      RoleId,
      { color: Hex; fontStyle: FontStyle[] } | null
    >;
    const mode = modeOf(src.type, found.bg?.color);
    const name = `${src.name ?? "Imported theme"}`.slice(0, 60 - " (imported)".length) + " (imported)";

    // Roles the file doesn't color come from a generated palette in the same mode, nudged to be readable.
    const filler = generate(hash(name), mode);
    const bg = found.bg?.color ?? filler.roles.bg.color;
    const missing: string[] = [];
    const roles = {} as ThemeState["roles"];
    for (const def of ROLES) {
      const f = found[def.id];
      if (f) {
        roles[def.id] = { color: f.color, locked: false, fontStyle: def.styleable ? f.fontStyle : [] };
      } else {
        const fill = filler.roles[def.id].color;
        const color = def.min && contrast(fill, bg) < def.min ? fixContrast(fill, bg, def.min) : fill;
        roles[def.id] = { color, locked: false, fontStyle: filler.roles[def.id].fontStyle };
        missing.push(def.label);
      }
    }

    const theme = validateTheme({ version: THEME_VERSION, name, mode, roles, vibe: { ...ZERO_VIBE } });
    if (!theme) return { ok: false, error: "Something in that file couldn't be turned into a theme." };

    const notes = [...src.notes];
    if (missing.length) {
      notes.push(
        `This theme has no color for ${list(missing)}, so ${missing.length === 1 ? "it was" : "they were"} filled in from a generated palette.`,
      );
    }
    notes.push(
      "SyntaxHue maps a theme onto its 15 colors. Rules for single languages, other token scopes" +
        (src.semantic ? ", semantic token colors" : "") +
        " and workbench colors beyond the basics aren't carried over; the preview and any export are built from the 15 colors.",
    );
    return { ok: true, theme, notes };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "That file couldn't be read as a theme." };
  }
}

function list(items: string[]): string {
  if (items.length <= 2) return items.join(" and ");
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

/** The theme with every color that is below its readable minimum nudged lightness-only, like the per-color Fix button. */
export function fixAllContrast(theme: ThemeState): ThemeState {
  const bg = theme.roles.bg.color;
  const roles = { ...theme.roles };
  for (const def of ROLES) {
    if (!def.min) continue;
    const color = fixContrast(roles[def.id].color, bg, def.min);
    if (color !== roles[def.id].color) roles[def.id] = { ...roles[def.id], color };
  }
  return { ...theme, roles };
}
