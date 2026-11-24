import { ansiPalette } from "../ansi";
import { mix, type Hex } from "../color";
import { slugify } from "../extension";
import { ROLE_IDS, type RoleId } from "../theme";
import type { PortInput, PortTarget, PortUse } from "./port";

/** One text attribute of the scheme. Colors are role ids or derived color names; `s` is the role whose font styles apply. */
interface Attr {
  fg?: string;
  bg?: string;
  /** Underline, wave or box in this color (EFFECT_TYPE: 1 underline, 2 wave, 0 box). */
  effect?: { color: string; type: 0 | 1 | 2 };
  stripe?: string;
  s?: RoleId;
}

const isRole = (k?: string): k is RoleId => !!k && (ROLE_IDS as readonly string[]).includes(k);
const hex = (c: Hex) => c.slice(1).toLowerCase();
const esc = (s: string) =>
  s
    .replace(/[\r\n]+/g, " ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Language-neutral `DEFAULT_*` attributes: the other languages' attributes inherit from these. */
const SYNTAX: [string, Attr][] = [
  ["TEXT", { fg: "fg", bg: "bg" }],
  ["DEFAULT_IDENTIFIER", { fg: "fg" }],
  ["DEFAULT_KEYWORD", { fg: "keyword" }],
  ["DEFAULT_STRING", { fg: "string" }],
  ["DEFAULT_VALID_STRING_ESCAPE", { fg: "constant" }],
  ["DEFAULT_INVALID_STRING_ESCAPE", { fg: "error", effect: { color: "error", type: 2 } }],
  ["DEFAULT_NUMBER", { fg: "constant" }],
  ["DEFAULT_CONSTANT", { fg: "constant" }],
  ["DEFAULT_PREDEFINED_SYMBOL", { fg: "constant" }],
  ["DEFAULT_LINE_COMMENT", { fg: "muted" }],
  ["DEFAULT_BLOCK_COMMENT", { fg: "muted" }],
  ["DEFAULT_DOC_COMMENT", { fg: "muted" }],
  ["DEFAULT_DOC_COMMENT_TAG", { fg: "muted" }],
  ["DEFAULT_DOC_COMMENT_TAG_VALUE", { fg: "muted" }],
  ["DEFAULT_DOC_MARKUP", { fg: "muted" }],
  ["DEFAULT_FUNCTION_DECLARATION", { fg: "function" }],
  ["DEFAULT_FUNCTION_CALL", { fg: "function" }],
  ["DEFAULT_STATIC_METHOD", { fg: "function" }],
  ["DEFAULT_METADATA", { fg: "function" }],
  ["DEFAULT_ATTRIBUTE", { fg: "function" }],
  ["DEFAULT_LABEL", { fg: "function" }],
  ["DEFAULT_CLASS_NAME", { fg: "type" }],
  ["DEFAULT_CLASS_REFERENCE", { fg: "type" }],
  ["DEFAULT_INTERFACE_NAME", { fg: "type" }],
  ["DEFAULT_TAG", { fg: "type" }],
  ["DEFAULT_ENTITY", { fg: "constant" }],
  ["DEFAULT_INSTANCE_FIELD", { fg: "variable" }],
  ["DEFAULT_STATIC_FIELD", { fg: "variable" }],
  ["DEFAULT_PARAMETER", { fg: "variable" }],
  ["DEFAULT_LOCAL_VARIABLE", { fg: "variable" }],
  ["DEFAULT_REASSIGNED_LOCAL_VARIABLE", { fg: "variable" }],
  ["DEFAULT_GLOBAL_VARIABLE", { fg: "variable" }],
  ["DEFAULT_OPERATION_SIGN", { fg: "operator" }],
  ["DEFAULT_BRACES", { fg: "operator" }],
  ["DEFAULT_BRACKETS", { fg: "operator" }],
  ["DEFAULT_PARENTHS", { fg: "operator" }],
  ["DEFAULT_COMMA", { fg: "operator" }],
  ["DEFAULT_DOT", { fg: "operator" }],
  ["DEFAULT_SEMICOLON", { fg: "operator" }],
  ["HYPERLINK_ATTRIBUTES", { fg: "constant", effect: { color: "constant", type: 1 } }],
  ["FOLLOWED_HYPERLINK_ATTRIBUTES", { fg: "constant", effect: { color: "constant", type: 1 } }],
];

/** Editor states: inspections, search, carets, braces, diffs and hints. */
const STATES: [string, Attr][] = [
  ["ERRORS_ATTRIBUTES", { effect: { color: "error", type: 2 }, stripe: "error" }],
  ["WARNING_ATTRIBUTES", { effect: { color: "warning", type: 2 }, stripe: "warning" }],
  ["WEAK_WARNING_ATTRIBUTES", { effect: { color: "warning", type: 2 }, stripe: "warning" }],
  ["INFO_ATTRIBUTES", { effect: { color: "info", type: 2 }, stripe: "info" }],
  ["TEXT_SEARCH_RESULT_ATTRIBUTES", { bg: "findmatch", stripe: "warning" }],
  ["SEARCH_RESULT_ATTRIBUTES", { bg: "findmatch", stripe: "warning" }],
  ["WRITE_SEARCH_RESULT_ATTRIBUTES", { bg: "findmatch", stripe: "warning" }],
  ["IDENTIFIER_UNDER_CARET_ATTRIBUTES", { bg: "accentTint" }],
  ["WRITE_IDENTIFIER_UNDER_CARET_ATTRIBUTES", { bg: "accentStrong" }],
  ["MATCHED_BRACE_ATTRIBUTES", { fg: "accent", bg: "accentTint" }],
  ["UNMATCHED_BRACE_ATTRIBUTES", { fg: "error" }],
  ["TODO_DEFAULT_ATTRIBUTES", { fg: "warning" }],
  ["INLINE_PARAMETER_HINT", { fg: "muted", bg: "widget" }],
  ["DIFF_INSERTED", { bg: "okTint", stripe: "success" }],
  ["DIFF_MODIFIED", { bg: "infoTint", stripe: "info" }],
  ["DIFF_DELETED", { bg: "errTint", stripe: "error" }],
  ["DIFF_CONFLICT", { bg: "warnTint", stripe: "warning" }],
  ["CONSOLE_ERROR_OUTPUT", { fg: "error" }],
  ["CONSOLE_NORMAL_OUTPUT", { fg: "fg" }],
  ["CONSOLE_SYSTEM_OUTPUT", { fg: "muted" }],
  ["CONSOLE_USER_INPUT", { fg: "success" }],
  ["LOG_ERROR_OUTPUT", { fg: "error" }],
];

/** Scheme-wide colors (the `<colors>` block). */
const COLORS: [string, string][] = [
  ["CARET_COLOR", "accent"],
  ["CARET_ROW_COLOR", "cursorline"],
  ["CONSOLE_BACKGROUND_KEY", "bg"],
  ["DOCUMENTATION_COLOR", "widget"],
  ["GUTTER_BACKGROUND", "bg"],
  ["LINE_NUMBERS_COLOR", "muted"],
  ["LINE_NUMBER_ON_CARET_ROW_COLOR", "fg"],
  ["INDENT_GUIDE", "guide"],
  ["SELECTED_INDENT_GUIDE", "activeGuide"],
  ["WHITESPACES", "faint"],
  ["RIGHT_MARGIN_COLOR", "guide"],
  ["SELECTION_BACKGROUND", "selection"],
  ["SELECTION_FOREGROUND", "fg"],
  ["METHOD_SEPARATORS_COLOR", "border"],
  ["TEARLINE_COLOR", "border"],
  ["ADDED_LINES_COLOR", "success"],
  ["MODIFIED_LINES_COLOR", "info"],
  ["DELETED_LINES_COLOR", "error"],
  ["FILESTATUS_ADDED", "success"],
  ["FILESTATUS_MODIFIED", "warning"],
  ["FILESTATUS_DELETED", "error"],
  ["FILESTATUS_UNKNOWN", "muted"],
];

/** The console's 16 ANSI colors, in the order of the keys below. */
const CONSOLE_ANSI = [
  "BLACK",
  "RED",
  "GREEN",
  "YELLOW",
  "BLUE",
  "MAGENTA",
  "CYAN",
  "GRAY",
  "DARKGRAY",
  "RED_BRIGHT",
  "GREEN_BRIGHT",
  "YELLOW_BRIGHT",
  "BLUE_BRIGHT",
  "MAGENTA_BRIGHT",
  "CYAN_BRIGHT",
  "WHITE",
];

/** Every named color: the roles plus colors derived from them (the scheme has no alpha). */
function palette(input: PortInput): Record<string, Hex> {
  const { roles: c, surfaces: s, mode } = input;
  const dark = mode === "dark";
  const bg = s.editor;
  const tint = (role: RoleId, t: number) => mix(bg, c[role], t);
  return {
    ...c,
    widget: s.widget,
    border: s.border,
    cursorline: mix(bg, c.fg, dark ? 0.05 : 0.045),
    selection: ansiPalette(input).selection,
    accentTint: tint("accent", 0.18),
    accentStrong: tint("accent", 0.3),
    findmatch: tint("warning", 0.35),
    errTint: tint("error", 0.15),
    warnTint: tint("warning", 0.15),
    infoTint: tint("info", 0.15),
    okTint: tint("success", 0.15),
    faint: mix(bg, c.muted, 0.4),
    guide: mix(bg, c.fg, 0.08),
    activeGuide: mix(bg, c.fg, 0.22),
  };
}

function scheme(input: PortInput): string {
  const colors = palette(input);
  const col = (k: string) => hex(colors[k]);
  const p = ansiPalette(input);

  const attr = (name: string, a: Attr) => {
    const o = (key: string, value: string) => `        <option name="${key}" value="${value}" />`;
    const lines: string[] = [];
    if (a.fg) lines.push(o("FOREGROUND", col(a.fg)));
    if (a.bg) lines.push(o("BACKGROUND", col(a.bg)));
    const role = a.s ?? (isRole(a.fg) ? a.fg : undefined);
    const st = role ? input.styles[role] : [];
    const font = (st.includes("bold") ? 1 : 0) + (st.includes("italic") ? 2 : 0);
    if (font) lines.push(o("FONT_TYPE", String(font)));
    if (a.effect) lines.push(o("EFFECT_COLOR", col(a.effect.color)), o("EFFECT_TYPE", String(a.effect.type)));
    else if (st.includes("underline") && a.fg) lines.push(o("EFFECT_COLOR", col(a.fg)), o("EFFECT_TYPE", "1"));
    if (a.stripe) lines.push(o("ERROR_STRIPE_COLOR", col(a.stripe)));
    return `    <option name="${name}">\n      <value>\n${lines.join("\n")}\n      </value>\n    </option>`;
  };

  // The console names its 16 colors so that GRAY is normal white and DARKGRAY is bright black.
  const all16 = [...p.normal, ...p.bright];
  const consoleColors = CONSOLE_ANSI.map(
    (n, k) =>
      `    <option name="CONSOLE_${n}_OUTPUT">\n      <value>\n        <option name="FOREGROUND" value="${hex(all16[k])}" />\n      </value>\n    </option>`,
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- ${esc(input.name)}, made with SyntaxHue -->
<scheme name="${esc(input.name)}" version="142" parent_scheme="${input.mode === "dark" ? "Darcula" : "Default"}">
  <colors>
${COLORS.map(([k, v]) => `    <option name="${k}" value="${col(v)}" />`).join("\n")}
  </colors>
  <attributes>
${[...SYNTAX, ...STATES].map(([n, a]) => attr(n, a)).join("\n")}
${consoleColors.join("\n")}
  </attributes>
</scheme>
`;
}

export const jetbrains: PortTarget = {
  id: "jetbrains",
  label: "JetBrains IDEs",
  group: "editor",
  install:
    "In the IDE open Settings, Editor, Color Scheme. Click the gear icon, choose Import Scheme…, pick the .icls file and confirm. Then choose the theme in the Scheme list. This colors the editor, console and diffs, not the IDE's own windows.",
  files: (input) => [{ path: `${slugify(input.name)}.icls`, content: scheme(input) }],
  uses(input): PortUse[] {
    const on = input.surfaces.editor;
    return ROLE_IDS.map((role) => ({
      role,
      color: input.roles[role],
      written: hex(input.roles[role]),
      on: role === "bg" ? undefined : on,
    }));
  },
};
