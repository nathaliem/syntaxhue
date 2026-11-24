import { mix, onColor, shiftL, withAlpha, type Hex } from "./color";
import type { RoleId, ThemeState } from "./theme";

export interface Surfaces {
  editor: Hex;
  sidebar: Hex;
  activityBar: Hex;
  panel: Hex;
  tabInactive: Hex;
  widget: Hex;
  input: Hex;
  border: Hex;
  lineHighlight: string;
  selection: string;
  onAccent: Hex;
}

/** Surface ladder derived from bg via OKLCH lightness steps. */
export function surfaces(t: ThemeState): Surfaces {
  const bg = t.roles.bg.color;
  const d = t.mode === "dark";
  const accent = t.roles.accent.color;
  return {
    editor: bg,
    sidebar: shiftL(bg, d ? -0.03 : -0.025),
    activityBar: shiftL(bg, d ? -0.05 : -0.045),
    panel: shiftL(bg, d ? -0.03 : -0.025),
    tabInactive: shiftL(bg, d ? -0.03 : -0.025),
    widget: shiftL(bg, d ? 0.04 : -0.015),
    input: shiftL(bg, d ? 0.035 : -0.03),
    border: mix(bg, t.roles.fg.color, d ? 0.12 : 0.14),
    lineHighlight: withAlpha(t.roles.fg.color, d ? 0.05 : 0.045),
    selection: withAlpha(accent, d ? 0.3 : 0.22),
    onAccent: onColor(accent),
  };
}

/** Which role each workbench key comes from — powers click-to-identify. */
export type KeySource = RoleId | "derived";

export function workbenchColors(t: ThemeState): Record<string, string> {
  const s = surfaces(t);
  const c = (id: RoleId) => t.roles[id].color;
  return {
    foreground: c("fg"),
    focusBorder: c("accent"),
    "widget.border": s.border,
    "selection.background": s.selection,
    descriptionForeground: c("muted"),
    errorForeground: c("error"),
    "icon.foreground": c("fg"),

    "editor.background": s.editor,
    "editor.foreground": c("fg"),
    "editor.lineHighlightBackground": s.lineHighlight,
    "editor.selectionBackground": s.selection,
    "editor.inactiveSelectionBackground": withAlpha(c("accent"), 0.15),
    "editor.wordHighlightBackground": withAlpha(c("accent"), 0.18),
    "editor.findMatchBackground": withAlpha(c("warning"), 0.35),
    "editor.findMatchHighlightBackground": withAlpha(c("warning"), 0.2),
    "editorCursor.foreground": c("accent"),
    "editorLineNumber.foreground": c("muted"),
    "editorLineNumber.activeForeground": c("fg"),
    "editorIndentGuide.background1": withAlpha(c("fg"), 0.08),
    "editorIndentGuide.activeBackground1": withAlpha(c("fg"), 0.22),
    "editorWhitespace.foreground": withAlpha(c("muted"), 0.4),
    "editorBracketMatch.background": withAlpha(c("accent"), 0.2),
    "editorBracketMatch.border": c("accent"),
    "editorError.foreground": c("error"),
    "editorWarning.foreground": c("warning"),
    "editorInfo.foreground": c("info"),
    "editorGutter.addedBackground": c("success"),
    "editorGutter.modifiedBackground": c("info"),
    "editorGutter.deletedBackground": c("error"),
    "editorWidget.background": s.widget,
    "editorWidget.border": s.border,
    "editorHoverWidget.background": s.widget,
    "editorHoverWidget.border": s.border,
    "editorSuggestWidget.background": s.widget,
    "editorSuggestWidget.border": s.border,
    "editorSuggestWidget.selectedBackground": withAlpha(c("accent"), 0.25),
    "editorGroupHeader.tabsBackground": s.tabInactive,
    "editorGroup.border": s.border,

    "activityBar.background": s.activityBar,
    "activityBar.foreground": c("fg"),
    "activityBar.inactiveForeground": c("muted"),
    "activityBar.activeBorder": c("accent"),
    "activityBarBadge.background": c("accent"),
    "activityBarBadge.foreground": s.onAccent,

    "sideBar.background": s.sidebar,
    "sideBar.foreground": c("fg"),
    "sideBar.border": s.border,
    "sideBarTitle.foreground": c("muted"),
    "sideBarSectionHeader.background": s.sidebar,
    "list.activeSelectionBackground": withAlpha(c("accent"), 0.25),
    "list.activeSelectionForeground": c("fg"),
    "list.inactiveSelectionBackground": withAlpha(c("accent"), 0.14),
    "list.hoverBackground": withAlpha(c("fg"), 0.06),
    "list.focusOutline": c("accent"),

    "tab.activeBackground": s.editor,
    "tab.activeForeground": c("fg"),
    "tab.inactiveBackground": s.tabInactive,
    "tab.inactiveForeground": c("muted"),
    "tab.activeBorderTop": c("accent"),
    "tab.border": s.border,
    "breadcrumb.foreground": c("muted"),

    "panel.background": s.panel,
    "panel.border": s.border,
    "panelTitle.activeForeground": c("fg"),
    "panelTitle.activeBorder": c("accent"),
    "panelTitle.inactiveForeground": c("muted"),
    "terminal.foreground": c("fg"),
    "terminal.ansiRed": c("error"),
    "terminal.ansiGreen": c("success"),
    "terminal.ansiYellow": c("warning"),
    "terminal.ansiBlue": c("info"),
    "terminal.ansiMagenta": c("keyword"),
    "terminal.ansiCyan": c("function"),

    "statusBar.background": c("accent"),
    "statusBar.foreground": s.onAccent,
    "statusBar.noFolderBackground": c("accent"),
    "statusBar.debuggingBackground": c("warning"),
    "titleBar.activeBackground": s.activityBar,
    "titleBar.activeForeground": c("fg"),
    "titleBar.inactiveBackground": s.activityBar,
    "titleBar.inactiveForeground": c("muted"),

    "input.background": s.input,
    "input.border": s.border,
    "input.foreground": c("fg"),
    "input.placeholderForeground": c("muted"),
    "dropdown.background": s.input,
    "dropdown.border": s.border,
    "button.background": c("accent"),
    "button.foreground": s.onAccent,
    "badge.background": c("accent"),
    "badge.foreground": s.onAccent,
    "textLink.foreground": c("accent"),
    "progressBar.background": c("accent"),
    "scrollbarSlider.background": withAlpha(c("fg"), 0.12),
    "scrollbarSlider.hoverBackground": withAlpha(c("fg"), 0.2),

    "gitDecoration.addedResourceForeground": c("success"),
    "gitDecoration.untrackedResourceForeground": c("success"),
    "gitDecoration.modifiedResourceForeground": c("warning"),
    "gitDecoration.deletedResourceForeground": c("error"),
    "gitDecoration.ignoredResourceForeground": c("muted"),
    "diffEditor.insertedTextBackground": withAlpha(c("success"), 0.15),
    "diffEditor.removedTextBackground": withAlpha(c("error"), 0.15),
  };
}

interface TokenRule {
  scope: string[];
  settings: { foreground: string; fontStyle?: string };
}

const SCOPES: { role: RoleId; scope: string[] }[] = [
  { role: "muted", scope: ["comment", "punctuation.definition.comment"] },
  { role: "keyword", scope: ["keyword", "storage", "storage.type", "storage.modifier", "keyword.control"] },
  { role: "string", scope: ["string", "string.regexp", "punctuation.definition.string"] },
  { role: "function", scope: ["entity.name.function", "support.function", "meta.function-call"] },
  {
    role: "type",
    scope: ["entity.name.type", "entity.name.class", "support.type", "support.class", "entity.other.inherited-class"],
  },
  { role: "variable", scope: ["variable", "variable.parameter", "variable.other.property", "meta.object-literal.key"] },
  {
    role: "constant",
    scope: ["constant.numeric", "constant.language", "constant.character", "variable.other.constant"],
  },
  { role: "operator", scope: ["keyword.operator", "punctuation", "meta.brace"] },
  { role: "type", scope: ["entity.name.tag"] },
  { role: "function", scope: ["entity.other.attribute-name"] },
];

export function tokenRules(t: ThemeState): TokenRule[] {
  return SCOPES.map(({ role, scope }) => {
    const r = t.roles[role];
    const settings: TokenRule["settings"] = { foreground: r.color };
    if (r.fontStyle.length) settings.fontStyle = r.fontStyle.join(" ");
    return { scope, settings };
  });
}

export function semanticRules(
  t: ThemeState,
): Record<string, string | { foreground: string; italic?: boolean; bold?: boolean; underline?: boolean }> {
  const rule = (id: RoleId) => {
    const r = t.roles[id];
    if (!r.fontStyle.length) return r.color;
    return {
      foreground: r.color,
      ...(r.fontStyle.includes("italic") && { italic: true }),
      ...(r.fontStyle.includes("bold") && { bold: true }),
      ...(r.fontStyle.includes("underline") && { underline: true }),
    };
  };
  return {
    function: rule("function"),
    method: rule("function"),
    type: rule("type"),
    class: rule("type"),
    interface: rule("type"),
    enum: rule("type"),
    variable: rule("variable"),
    parameter: rule("variable"),
    property: rule("variable"),
    "variable.readonly": rule("constant"),
    enumMember: rule("constant"),
    keyword: rule("keyword"),
    comment: rule("muted"),
    string: rule("string"),
    number: rule("constant"),
  };
}

export const BASE_THEME: Record<ThemeState["mode"], string> = {
  dark: "Default Dark Modern",
  light: "Default Light Modern",
};

/** The object to merge into user settings.json. `scoped` wraps each block in "[Base Theme]". */
export function settingsSnippet(t: ThemeState, scoped = true) {
  const scope = `[${BASE_THEME[t.mode]}]`;
  const wrap = <T>(v: T) => (scoped ? { [scope]: v } : v);
  return {
    "workbench.colorTheme": BASE_THEME[t.mode],
    "workbench.colorCustomizations": wrap(workbenchColors(t)),
    "editor.tokenColorCustomizations": wrap({ textMateRules: tokenRules(t) }),
    "editor.semanticTokenColorCustomizations": wrap({ enabled: true, rules: semanticRules(t) }),
  };
}

/** Text ready to paste inside the outer braces of settings.json (no wrapping braces). */
export function settingsSnippetText(t: ThemeState, scoped = true): string {
  const json = JSON.stringify(settingsSnippet(t, scoped), null, 2);
  const inner = json
    .slice(1, -1)
    .trim()
    .split("\n")
    .map((l) => l.replace(/^ {2}/, ""))
    .join("\n");
  return `// ${t.name} — generated by Hueprint\n${inner},`;
}

/** Standalone color theme file (*-color-theme.json). */
export function themeFile(t: ThemeState) {
  return {
    $schema: "vscode://schemas/color-theme",
    name: t.name,
    type: t.mode,
    semanticHighlighting: true,
    colors: workbenchColors(t),
    tokenColors: tokenRules(t),
    semanticTokenColors: semanticRules(t),
  };
}
