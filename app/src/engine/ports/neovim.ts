import { ansiPalette } from "../ansi";
import { mix, type Hex } from "../color";
import { slugify } from "../extension";
import { ROLE_IDS, type RoleId } from "../theme";
import type { PortInput, PortTarget, PortUse } from "./port";

/** A highlight group: colors are keys of the `c` table in the file; `s` names the role whose font styles apply. */
interface Spec {
  fg?: string;
  bg?: string;
  sp?: string;
  s?: RoleId;
  x?: ("bold" | "italic" | "underline" | "undercurl" | "reverse")[];
}

const isRole = (k?: string): k is RoleId => !!k && (ROLE_IDS as readonly string[]).includes(k);

/** Classic Vim groups: the editor, the UI, and the syntax groups every language falls back to. */
const EDITOR: [string, Spec][] = [
  ["Normal", { fg: "fg", bg: "bg" }],
  ["NormalNC", { fg: "fg", bg: "bg" }],
  ["NormalFloat", { fg: "fg", bg: "widget" }],
  ["FloatBorder", { fg: "border", bg: "widget" }],
  ["FloatTitle", { fg: "accent", bg: "widget" }],
  ["Cursor", { fg: "bg", bg: "accent" }],
  ["lCursor", { fg: "bg", bg: "accent" }],
  ["CursorLine", { bg: "cursorline" }],
  ["CursorColumn", { bg: "cursorline" }],
  ["ColorColumn", { bg: "cursorline" }],
  ["CursorLineNr", { fg: "fg" }],
  ["LineNr", { fg: "muted" }],
  ["SignColumn", { fg: "muted", bg: "bg" }],
  ["FoldColumn", { fg: "muted", bg: "bg" }],
  ["Folded", { fg: "muted", bg: "cursorline" }],
  ["Visual", { bg: "selection" }],
  ["VisualNOS", { bg: "selection" }],
  ["Search", { bg: "findmatch" }],
  ["CurSearch", { fg: "bg", bg: "warning" }],
  ["IncSearch", { fg: "bg", bg: "warning" }],
  ["Substitute", { fg: "bg", bg: "error" }],
  ["MatchParen", { fg: "accent", bg: "accentTint", x: ["bold"] }],
  ["NonText", { fg: "faint" }],
  ["Whitespace", { fg: "faint" }],
  ["EndOfBuffer", { fg: "bg" }],
  ["Conceal", { fg: "muted" }],
  ["SpecialKey", { fg: "faint" }],
  ["Directory", { fg: "function" }],
  ["Title", { fg: "function", x: ["bold"] }],
  ["ErrorMsg", { fg: "error" }],
  ["WarningMsg", { fg: "warning" }],
  ["MoreMsg", { fg: "success" }],
  ["Question", { fg: "success" }],
  ["ModeMsg", { fg: "fg" }],
  ["Pmenu", { fg: "fg", bg: "widget" }],
  ["PmenuSel", { fg: "fg", bg: "selection" }],
  ["PmenuSbar", { bg: "border" }],
  ["PmenuThumb", { bg: "muted" }],
  ["WildMenu", { fg: "fg", bg: "selection" }],
  ["StatusLine", { fg: "fg", bg: "activity" }],
  ["StatusLineNC", { fg: "muted", bg: "activity" }],
  ["TabLine", { fg: "muted", bg: "activity" }],
  ["TabLineSel", { fg: "fg", bg: "bg" }],
  ["TabLineFill", { bg: "activity" }],
  ["WinBar", { fg: "fg", bg: "bg" }],
  ["WinBarNC", { fg: "muted", bg: "bg" }],
  ["WinSeparator", { fg: "border" }],
  ["VertSplit", { fg: "border" }],
  ["Added", { fg: "success" }],
  ["Changed", { fg: "warning" }],
  ["Removed", { fg: "error" }],
  ["DiffAdd", { bg: "okTint" }],
  ["DiffChange", { bg: "warnTint" }],
  ["DiffDelete", { fg: "error", bg: "errTint" }],
  ["DiffText", { bg: "warnStrong" }],
  ["SpellBad", { sp: "error", x: ["undercurl"] }],
  ["SpellCap", { sp: "warning", x: ["undercurl"] }],
  ["SpellLocal", { sp: "info", x: ["undercurl"] }],
  ["SpellRare", { sp: "info", x: ["undercurl"] }],
  ["IblIndent", { fg: "guide" }],
  ["IblScope", { fg: "activeGuide" }],
];

const SYNTAX: [string, Spec][] = [
  ["Comment", { fg: "muted" }],
  ["SpecialComment", { fg: "muted" }],
  ["Ignore", { fg: "muted" }],
  ["Constant", { fg: "constant" }],
  ["String", { fg: "string" }],
  ["Character", { fg: "string" }],
  ["Number", { fg: "constant" }],
  ["Boolean", { fg: "constant" }],
  ["Float", { fg: "constant" }],
  ["Identifier", { fg: "variable" }],
  ["Function", { fg: "function" }],
  ["Statement", { fg: "keyword" }],
  ["Conditional", { fg: "keyword" }],
  ["Repeat", { fg: "keyword" }],
  ["Label", { fg: "keyword" }],
  ["Exception", { fg: "keyword" }],
  ["Keyword", { fg: "keyword" }],
  ["PreProc", { fg: "keyword" }],
  ["Include", { fg: "keyword" }],
  ["Define", { fg: "keyword" }],
  ["Macro", { fg: "keyword" }],
  ["PreCondit", { fg: "keyword" }],
  ["StorageClass", { fg: "keyword" }],
  ["Operator", { fg: "operator" }],
  ["Delimiter", { fg: "operator" }],
  ["Type", { fg: "type" }],
  ["Structure", { fg: "type" }],
  ["Typedef", { fg: "type" }],
  ["Tag", { fg: "type" }],
  ["Special", { fg: "constant" }],
  ["SpecialChar", { fg: "constant" }],
  ["Debug", { fg: "warning" }],
  ["Underlined", { fg: "accent", x: ["underline"] }],
  ["Error", { fg: "error" }],
  ["Todo", { fg: "warning", x: ["bold"] }],
];

const DIAGNOSTICS: [string, Spec][] = (
  [
    ["Error", "error", "errTint"],
    ["Warn", "warning", "warnTint"],
    ["Info", "info", "infoTint"],
    ["Hint", "info", "infoTint"],
    ["Ok", "success", "okTint"],
  ] as const
).flatMap(([name, color, tint]): [string, Spec][] => [
  [`Diagnostic${name}`, { fg: color }],
  [`DiagnosticVirtualText${name}`, { fg: color, bg: tint }],
  [`DiagnosticUnderline${name}`, { sp: color, x: ["undercurl"] }],
]);

/** Tree-sitter captures. The roles follow the shared scope table (tag and enum are Type, attribute is Function). */
const TREESITTER: [string, Spec][] = [
  ["@comment", { fg: "muted" }],
  ["@comment.documentation", { fg: "muted" }],
  ["@string", { fg: "string" }],
  ["@string.regexp", { fg: "string" }],
  ["@string.special", { fg: "string" }],
  ["@string.escape", { fg: "constant" }],
  ["@character", { fg: "string" }],
  ["@number", { fg: "constant" }],
  ["@number.float", { fg: "constant" }],
  ["@boolean", { fg: "constant" }],
  ["@constant", { fg: "constant" }],
  ["@constant.builtin", { fg: "constant" }],
  ["@constant.macro", { fg: "constant" }],
  ["@variable", { fg: "variable" }],
  ["@variable.builtin", { fg: "constant" }],
  ["@variable.parameter", { fg: "variable" }],
  ["@variable.member", { fg: "variable" }],
  ["@property", { fg: "variable" }],
  ["@field", { fg: "variable" }],
  ["@function", { fg: "function" }],
  ["@function.call", { fg: "function" }],
  ["@function.builtin", { fg: "function" }],
  ["@function.method", { fg: "function" }],
  ["@function.method.call", { fg: "function" }],
  ["@function.macro", { fg: "function" }],
  ["@constructor", { fg: "type" }],
  ["@keyword", { fg: "keyword" }],
  ["@keyword.function", { fg: "keyword" }],
  ["@keyword.return", { fg: "keyword" }],
  ["@keyword.import", { fg: "keyword" }],
  ["@keyword.operator", { fg: "operator" }],
  ["@operator", { fg: "operator" }],
  ["@type", { fg: "type" }],
  ["@type.builtin", { fg: "type" }],
  ["@type.definition", { fg: "type" }],
  ["@module", { fg: "type" }],
  ["@attribute", { fg: "function" }],
  ["@label", { fg: "function" }],
  ["@tag", { fg: "type" }],
  ["@tag.attribute", { fg: "function" }],
  ["@tag.delimiter", { fg: "operator" }],
  ["@punctuation.delimiter", { fg: "operator" }],
  ["@punctuation.bracket", { fg: "operator" }],
  ["@punctuation.special", { fg: "operator" }],
  ["@markup.heading", { fg: "function", x: ["bold"] }],
  ["@markup.link", { fg: "constant", x: ["underline"] }],
  ["@markup.link.url", { fg: "constant", x: ["underline"] }],
  ["@markup.raw", { fg: "string" }],
  ["@markup.strong", { x: ["bold"] }],
  ["@markup.italic", { x: ["italic"] }],
  ["@diff.plus", { fg: "success" }],
  ["@diff.minus", { fg: "error" }],
  ["@diff.delta", { fg: "warning" }],
];

/** LSP semantic tokens: the same set the VS Code theme colors. */
const LSP: [string, Spec][] = [
  ["@lsp.type.function", { fg: "function" }],
  ["@lsp.type.method", { fg: "function" }],
  ["@lsp.type.macro", { fg: "function" }],
  ["@lsp.type.type", { fg: "type" }],
  ["@lsp.type.class", { fg: "type" }],
  ["@lsp.type.interface", { fg: "type" }],
  ["@lsp.type.enum", { fg: "type" }],
  ["@lsp.type.struct", { fg: "type" }],
  ["@lsp.type.typeParameter", { fg: "type" }],
  ["@lsp.type.namespace", { fg: "type" }],
  ["@lsp.type.variable", { fg: "variable" }],
  ["@lsp.type.parameter", { fg: "variable" }],
  ["@lsp.type.property", { fg: "variable" }],
  ["@lsp.typemod.variable.readonly", { fg: "constant" }],
  ["@lsp.typemod.variable.defaultLibrary", { fg: "constant" }],
  ["@lsp.type.enumMember", { fg: "constant" }],
  ["@lsp.type.keyword", { fg: "keyword" }],
  ["@lsp.type.comment", { fg: "muted" }],
  ["@lsp.type.string", { fg: "string" }],
  ["@lsp.type.number", { fg: "constant" }],
  ["@lsp.type.operator", { fg: "operator" }],
];

const GROUPS = [...EDITOR, ...SYNTAX, ...DIAGNOSTICS, ...TREESITTER, ...LSP];

/** Every named color in the file: the roles plus colors derived from them (Neovim has no alpha). */
function palette(input: PortInput): Record<string, Hex> {
  const { roles: c, surfaces: s, mode } = input;
  const dark = mode === "dark";
  const bg = s.editor;
  const tint = (role: RoleId, t: number) => mix(bg, c[role], t);
  return {
    ...c,
    widget: s.widget,
    sidebar: s.sidebar,
    activity: s.activityBar,
    border: s.border,
    cursorline: mix(bg, c.fg, dark ? 0.05 : 0.045),
    selection: ansiPalette(input).selection,
    accentTint: tint("accent", 0.2),
    findmatch: tint("warning", 0.35),
    errTint: tint("error", 0.15),
    warnTint: tint("warning", 0.15),
    infoTint: tint("info", 0.15),
    okTint: tint("success", 0.15),
    warnStrong: tint("warning", 0.35),
    faint: mix(bg, c.muted, 0.4),
    guide: mix(bg, c.fg, 0.08),
    activeGuide: mix(bg, c.fg, 0.22),
  };
}

function lua(input: PortInput): string {
  const colors = palette(input);
  const name = slugify(input.name);
  const attrs = (spec: Spec): string => {
    const parts: string[] = [];
    if (spec.fg) parts.push(`fg = c.${spec.fg}`);
    if (spec.bg) parts.push(`bg = c.${spec.bg}`);
    if (spec.sp) parts.push(`sp = c.${spec.sp}`);
    const fromRole = spec.s ?? (isRole(spec.fg) ? spec.fg : undefined);
    const styles = new Set<string>([...(spec.x ?? []), ...(fromRole ? input.styles[fromRole] : [])]);
    for (const st of ["bold", "italic", "underline", "undercurl", "reverse"]) {
      if (styles.has(st)) parts.push(`${st} = true`);
    }
    return `{ ${parts.join(", ")} }`;
  };
  const p = ansiPalette(input);
  const term = [...p.normal, ...p.bright].map((col, k) => `vim.g.terminal_color_${k} = "${col}"`);
  return `-- ${input.name.replace(/[\r\n]+/g, " ")}, made with SyntaxHue
-- Save as colors/${name}.lua on your runtimepath, then run :colorscheme ${name}

vim.cmd("highlight clear")
if vim.fn.exists("syntax_on") == 1 then
  vim.cmd("syntax reset")
end
vim.o.termguicolors = true
vim.o.background = "${input.mode}"
vim.g.colors_name = "${name}"

local c = {
${Object.entries(colors)
  .map(([k, v]) => `  ${k} = "${v}",`)
  .join("\n")}
}

local function hl(group, spec)
  vim.api.nvim_set_hl(0, group, spec)
end

${GROUPS.map(([g, spec]) => `hl("${g}", ${attrs(spec)})`).join("\n")}

${term.join("\n")}
`;
}

export const neovim: PortTarget = {
  id: "neovim",
  label: "Neovim",
  group: "editor",
  install:
    'Save the file as ~/.config/nvim/colors/<file name>.lua (keep the colors folder). Then run :colorscheme with the file name, or put vim.cmd.colorscheme("<file name>") in your init.lua. Needs Neovim 0.9 or newer; Tree-sitter and LSP colors apply where you use them.',
  files: (input) => [{ path: `colors/${slugify(input.name)}.lua`, content: lua(input) }],
  uses(input): PortUse[] {
    const on = input.surfaces.editor;
    return ROLE_IDS.map((role) => ({ role, color: input.roles[role], on: role === "bg" ? undefined : on }));
  },
};
