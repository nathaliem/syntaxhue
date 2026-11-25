import { settingsSnippet } from "./derive";
import { parseJsonc } from "./importTheme";
import type { ThemeState } from "./theme";

/**
 * Merge mode: takes the text of a user's `settings.json` and returns it with this theme's keys merged in.
 * Only the keys we own are touched, anything else (other settings, comments, formatting, trailing commas) stays
 * exactly as it was. The text is only parsed as data, never evaluated.
 */

export type MergeOutcome = { ok: true; text: string; notes: string[] } | { ok: false; error: string };

interface Prop {
  key: string;
  start: number; // start of the key's opening quote
  valStart: number;
  valEnd: number; // exclusive
}

interface Top {
  open: number;
  close: number;
  props: Prop[];
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Index after any whitespace and comments starting at `i`. */
function skip(text: string, i: number): number {
  for (;;) {
    while (i < text.length && /\s/.test(text[i])) i++;
    if (text.startsWith("//", i)) {
      while (i < text.length && text[i] !== "\n") i++;
    } else if (text.startsWith("/*", i)) {
      const end = text.indexOf("*/", i + 2);
      i = end === -1 ? text.length : end + 2;
    } else return i;
  }
}

function stringEnd(text: string, i: number): number {
  let j = i + 1;
  while (j < text.length && text[j] !== '"') j += text[j] === "\\" ? 2 : 1;
  return j + 1;
}

/** End (exclusive) of the JSON value starting at `i`. */
function valueEnd(text: string, i: number): number {
  if (text[i] === '"') return stringEnd(text, i);
  if (text[i] === "{" || text[i] === "[") {
    let depth = 0;
    let j = i;
    while (j < text.length) {
      const c = text[j];
      if (c === '"') j = stringEnd(text, j);
      else if (text.startsWith("//", j) || text.startsWith("/*", j)) j = skip(text, j);
      else {
        if (c === "{" || c === "[") depth++;
        else if (c === "}" || c === "]") depth--;
        j++;
        if (depth === 0) return j;
      }
    }
    return text.length;
  }
  let j = i;
  while (j < text.length && !/[\s,}\]/]/.test(text[j])) j++;
  return j;
}

function scanTop(text: string): Top | null {
  const open = skip(text, text.charCodeAt(0) === 0xfeff ? 1 : 0);
  if (text[open] !== "{") return null;
  const props: Prop[] = [];
  let i = skip(text, open + 1);
  while (i < text.length && text[i] !== "}") {
    if (text[i] !== '"') return null;
    const kEnd = stringEnd(text, i);
    let key: string;
    try {
      key = JSON.parse(text.slice(i, kEnd));
    } catch {
      return null;
    }
    const colon = skip(text, kEnd);
    if (text[colon] !== ":") return null;
    const valStart = skip(text, colon + 1);
    const end = valueEnd(text, valStart);
    props.push({ key, start: i, valStart, valEnd: end });
    i = skip(text, end);
    if (text[i] === ",") i = skip(text, i + 1);
  }
  if (text[i] !== "}") return null;
  return { open, close: i, props };
}

// ---------- merging values ----------

const ruleKey = (r: unknown) => JSON.stringify(isObject(r) ? r.scope : r);

/** Our values win; objects merge key by key; `textMateRules` merge by scope so the user's other rules stay. */
function merge(existing: unknown, ours: unknown, key = ""): unknown {
  if (isObject(existing) && isObject(ours)) {
    const out: Record<string, unknown> = { ...existing };
    for (const [k, v] of Object.entries(ours)) out[k] = k in existing ? merge(existing[k], v, k) : v;
    return out;
  }
  if (key === "textMateRules" && Array.isArray(existing) && Array.isArray(ours)) {
    const mine = new Set(ours.map(ruleKey));
    return [...existing.filter((r) => !mine.has(ruleKey(r))), ...ours];
  }
  return ours;
}

function indentOf(text: string, top: Top): string {
  const p = top.props[0];
  if (!p) return "  ";
  const lineStart = text.lastIndexOf("\n", p.start - 1) + 1;
  const lead = text.slice(lineStart, p.start);
  return /^[ \t]+$/.test(lead) ? lead : "  ";
}

/** JSON text for `v` placed at one level of indentation. */
function render(v: unknown, unit: string): string {
  return JSON.stringify(v, null, unit)
    .split("\n")
    .join("\n" + unit);
}

const hasComment = (s: string) => {
  let i = 0;
  while (i < s.length) {
    if (s[i] === '"') i = stringEnd(s, i);
    else if (s.startsWith("//", i) || s.startsWith("/*", i)) return true;
    else i++;
  }
  return false;
};

export function mergeSettings(input: string, theme: ThemeState, scoped = true): MergeOutcome {
  const text = input.trim() === "" ? "{\n}\n" : input;
  const top = scanTop(text);
  if (!top) return { ok: false, error: "This doesn't look like a settings.json: it should be one { … } object." };
  try {
    parseJsonc(text);
  } catch {
    return { ok: false, error: "This settings.json has a syntax error somewhere, so it wasn't changed." };
  }

  const notes: string[] = [];
  const ours = settingsSnippet(theme, scoped) as Record<string, unknown>;
  const unit = indentOf(text, top);
  const edits: { start: number; end: number; text: string }[] = [];
  const added: string[] = [];

  for (const [key, value] of Object.entries(ours)) {
    const found = top.props.filter((p) => p.key === key);
    const last = found[found.length - 1];
    if (found.length > 1)
      notes.push(`“${key}” appeared ${found.length} times; VS Code uses the last one, so that one was merged.`);
    if (!last) {
      added.push(`${unit}${JSON.stringify(key)}: ${render(value, unit)}`);
      continue;
    }
    const old = text.slice(last.valStart, last.valEnd);
    let existing: unknown;
    try {
      existing = parseJsonc(old);
    } catch {
      return { ok: false, error: `Couldn't read the value of “${key}”, so nothing was changed.` };
    }
    const merged = merge(existing, value);
    if (hasComment(old)) notes.push(`Comments inside “${key}” were dropped; the rest of the file keeps its comments.`);
    edits.push({ start: last.valStart, end: last.valEnd, text: render(merged, unit) });
  }

  if (added.length) {
    // Insert before the closing brace, adding a comma after the last property if there isn't one already.
    const lastEnd = top.props.length ? top.props[top.props.length - 1].valEnd : top.open + 1;
    const gap = text.slice(lastEnd, top.close);
    const needsComma = top.props.length > 0 && !/^(\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*,/.test(gap);
    const body = `\n${unit}// ${theme.name}: added by SyntaxHue\n${added.join(",\n")}\n`;
    // Keep a trailing comma in files that already use them; otherwise end cleanly.
    const trailing = /,\s*$/.test(gap.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "")) ? "," : "";
    const closeAt = top.close;
    edits.push({ start: closeAt, end: closeAt, text: body.replace(/\n$/, trailing + "\n") });
    // Pushed after the body: when both land at the same spot the comma is applied last, so it ends up in front.
    if (needsComma) edits.push({ start: lastEnd, end: lastEnd, text: "," });
  }

  let out = text;
  for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  if (!added.length && !edits.length) notes.push("Nothing to merge.");
  return { ok: true, text: out, notes };
}
