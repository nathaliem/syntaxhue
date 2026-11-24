import { withAlpha } from "../color";
import { SCOPES } from "../derive";
import { slugify } from "../extension";
import { ROLE_BY_ID, ROLE_IDS, type RoleId } from "../theme";
import type { PortInput, PortTarget, PortUse } from "./port";

/** Scopes beyond the shared table: states Sublime colors through `markup`, `invalid` and diff scopes. */
const EXTRA: { role: RoleId; name: string; scope: string[] }[] = [
  { role: "error", name: "Invalid and deleted", scope: ["invalid", "markup.deleted", "meta.diff.deleted"] },
  { role: "warning", name: "Deprecated and changed", scope: ["invalid.deprecated", "markup.changed"] },
  { role: "success", name: "Inserted", scope: ["markup.inserted", "meta.diff.inserted"] },
  { role: "info", name: "Diff headers", scope: ["meta.diff.header", "meta.diff.range"] },
];

const ref = (name: string) => `var(${name})`;

function scheme(input: PortInput) {
  const { roles: c, surfaces: s, styles } = input;
  const variables: Record<string, string> = {};
  for (const id of ROLE_IDS) variables[id] = c[id];
  variables.border = s.border;
  variables.widget = s.widget;
  variables.sidebar = s.sidebar;

  const fontStyle = (role: RoleId) => (styles[role].length ? { font_style: styles[role].join(" ") } : {});
  const rules = [
    ...SCOPES.map(({ role, scope }) => ({
      name: ROLE_BY_ID[role].label,
      scope: scope.join(", "),
      foreground: ref(role),
      ...fontStyle(role),
    })),
    ...EXTRA.map(({ role, name, scope }) => ({ name, scope: scope.join(", "), foreground: ref(role) })),
  ];

  return {
    name: input.name,
    author: "SyntaxHue",
    variables,
    globals: {
      background: ref("bg"),
      foreground: ref("fg"),
      caret: ref("accent"),
      accent: ref("accent"),
      line_highlight: s.lineHighlight,
      selection: s.selection,
      inactive_selection: withAlpha(c.accent, 0.15),
      selection_border: ref("accent"),
      find_highlight: ref("warning"),
      find_highlight_foreground: ref("bg"),
      highlight: ref("warning"),
      invisibles: withAlpha(c.muted, 0.4),
      guide: withAlpha(c.fg, 0.08),
      active_guide: withAlpha(c.fg, 0.22),
      stack_guide: withAlpha(c.fg, 0.14),
      brackets_foreground: ref("accent"),
      brackets_options: "underline",
      bracket_contents_foreground: ref("accent"),
      tags_foreground: ref("type"),
      misspelling: ref("error"),
      gutter: ref("bg"),
      gutter_foreground: ref("muted"),
      shadow: "#00000040",
    },
    rules,
  };
}

export const sublime: PortTarget = {
  id: "sublime",
  label: "Sublime Text",
  group: "editor",
  install:
    "In Sublime Text choose Preferences, Browse Packages…, open the User folder and save the file there. Then choose Preferences, Select Color Scheme… and pick the theme. This colors the editor; the window chrome keeps the Sublime theme you use.",
  files: (input) => [
    { path: `${slugify(input.name)}.sublime-color-scheme`, content: JSON.stringify(scheme(input), null, 2) + "\n" },
  ],
  uses(input): PortUse[] {
    const on = input.surfaces.editor;
    return ROLE_IDS.map((role) => ({ role, color: input.roles[role], on: role === "bg" ? undefined : on }));
  },
};
