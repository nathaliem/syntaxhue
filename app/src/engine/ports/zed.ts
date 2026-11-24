import { ansiPalette } from "../ansi";
import { withAlpha, type Hex } from "../color";
import { slugify } from "../extension";
import { ROLE_IDS, type RoleId } from "../theme";
import type { PortInput, PortTarget, PortUse } from "./port";

/** Where each syntax key of a Zed theme gets its color: the role, as in the shared scope table. */
const SYNTAX: [string, RoleId][] = [
  ["comment", "muted"],
  ["comment.doc", "muted"],
  ["keyword", "keyword"],
  ["preproc", "keyword"],
  ["string", "string"],
  ["string.escape", "constant"],
  ["string.regex", "string"],
  ["string.special", "string"],
  ["string.special.symbol", "constant"],
  ["function", "function"],
  ["attribute", "function"],
  ["title", "function"],
  ["label", "function"],
  ["type", "type"],
  ["constructor", "type"],
  ["enum", "type"],
  ["tag", "type"],
  ["variant", "type"],
  ["variable", "variable"],
  ["variable.special", "variable"],
  ["property", "variable"],
  ["primary", "fg"],
  ["embedded", "fg"],
  ["constant", "constant"],
  ["number", "constant"],
  ["boolean", "constant"],
  ["operator", "operator"],
  ["punctuation", "operator"],
  ["punctuation.bracket", "operator"],
  ["punctuation.delimiter", "operator"],
  ["punctuation.list_marker", "operator"],
  ["punctuation.special", "operator"],
  ["link_text", "accent"],
  ["link_uri", "constant"],
  ["text.literal", "string"],
  ["hint", "info"],
];

const SCHEMA = "https://zed.dev/schema/themes/v0.2.0.json";

/** Zed accepts `#rrggbbaa`, so tints are written as alpha colors, as in the VS Code theme. */
function style(input: PortInput) {
  const { roles: c, surfaces: s, styles } = input;
  const p = ansiPalette(input);
  const a = (hex: Hex, alpha: number) => withAlpha(hex, alpha);

  const syntax: Record<string, { color: Hex; font_style?: string; font_weight?: number }> = {};
  for (const [key, role] of SYNTAX) {
    const st = styles[role];
    syntax[key] = {
      color: c[role],
      ...(st.includes("italic") && { font_style: "italic" }),
      ...(st.includes("bold") && { font_weight: 700 }),
    };
  }

  const status = (name: string, role: RoleId) => ({
    [name]: c[role],
    [`${name}.background`]: a(c[role], 0.12),
    [`${name}.border`]: a(c[role], 0.4),
  });

  const ansi: Record<string, Hex> = {};
  ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"].forEach((n, k) => {
    ansi[`terminal.ansi.${n}`] = p.normal[k];
    ansi[`terminal.ansi.bright_${n}`] = p.bright[k];
  });

  return {
    border: s.border,
    "border.variant": s.border,
    "border.focused": c.accent,
    "border.selected": c.accent,
    "border.transparent": "#00000000",
    "border.disabled": s.border,
    "elevated_surface.background": s.widget,
    "surface.background": s.sidebar,
    background: s.sidebar,
    "element.background": s.input,
    "element.hover": a(c.fg, 0.06),
    "element.active": a(c.accent, 0.25),
    "element.selected": a(c.accent, 0.25),
    "element.disabled": a(c.fg, 0.04),
    "ghost_element.background": "#00000000",
    "ghost_element.hover": a(c.fg, 0.06),
    "ghost_element.active": a(c.accent, 0.25),
    "ghost_element.selected": a(c.accent, 0.18),
    "ghost_element.disabled": a(c.fg, 0.04),
    text: c.fg,
    "text.muted": c.muted,
    "text.placeholder": c.muted,
    "text.disabled": a(c.muted, 0.6),
    "text.accent": c.accent,
    icon: c.fg,
    "icon.muted": c.muted,
    "icon.disabled": a(c.muted, 0.6),
    "icon.placeholder": c.muted,
    "icon.accent": c.accent,
    "status_bar.background": s.activityBar,
    "title_bar.background": s.activityBar,
    "title_bar.inactive_background": s.activityBar,
    "toolbar.background": s.editor,
    "tab_bar.background": s.tabInactive,
    "tab.inactive_background": s.tabInactive,
    "tab.active_background": s.editor,
    "search.match_background": a(c.warning, 0.3),
    "panel.background": s.panel,
    "panel.focused_border": c.accent,
    "pane.focused_border": c.accent,
    "scrollbar.thumb.background": a(c.fg, 0.12),
    "scrollbar.thumb.hover_background": a(c.fg, 0.2),
    "scrollbar.thumb.border": "#00000000",
    "scrollbar.track.background": "#00000000",
    "scrollbar.track.border": "#00000000",
    "editor.foreground": c.fg,
    "editor.background": s.editor,
    "editor.gutter.background": s.editor,
    "editor.subheader.background": s.sidebar,
    "editor.active_line.background": s.lineHighlight,
    "editor.highlighted_line.background": s.lineHighlight,
    "editor.line_number": c.muted,
    "editor.active_line_number": c.fg,
    "editor.invisible": a(c.muted, 0.4),
    "editor.wrap_guide": a(c.fg, 0.08),
    "editor.active_wrap_guide": a(c.fg, 0.22),
    "editor.document_highlight.read_background": a(c.accent, 0.18),
    "editor.document_highlight.write_background": a(c.accent, 0.3),
    "terminal.background": p.background,
    "terminal.foreground": p.foreground,
    "terminal.bright_foreground": p.foreground,
    ...ansi,
    "link_text.hover": c.accent,
    ...status("error", "error"),
    ...status("warning", "warning"),
    ...status("info", "info"),
    ...status("success", "success"),
    ...status("created", "success"),
    ...status("modified", "warning"),
    ...status("deleted", "error"),
    ...status("conflict", "warning"),
    ...status("hint", "info"),
    ignored: c.muted,
    hidden: c.muted,
    predictive: c.muted,
    renamed: c.info,
    unreachable: c.muted,
    players: [{ cursor: c.accent, background: c.accent, selection: s.selection }],
    syntax,
  };
}

export const zed: PortTarget = {
  id: "zed",
  label: "Zed",
  group: "editor",
  install:
    "Save the file in ~/.config/zed/themes/ (create the folder if needed). Zed picks it up on its own: open the command palette, run “theme selector: toggle” and choose the theme.",
  files: (input) => [
    {
      path: `${slugify(input.name)}.json`,
      content:
        JSON.stringify(
          {
            $schema: SCHEMA,
            name: input.name,
            author: "Hueprint",
            themes: [{ name: input.name, appearance: input.mode, style: style(input) }],
          },
          null,
          2,
        ) + "\n",
    },
  ],
  uses(input): PortUse[] {
    const c = input.roles;
    const on = input.surfaces.editor;
    return ROLE_IDS.map((role) => ({ role, color: c[role], on: role === "bg" ? undefined : on }));
  },
};
