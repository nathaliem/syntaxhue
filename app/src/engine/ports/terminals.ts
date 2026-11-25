import { ansiPalette, type AnsiPalette } from "../ansi";
import { hexToRgb, type Hex } from "../color";
import { slugify } from "../extension";
import type { RoleId } from "../theme";
import type { PortInput, PortTarget, PortUse } from "./port";

/** Terminals have no syntax highlighting: only these roles reach the ANSI palette and the cursor. */
const UNUSED: Partial<Record<RoleId, string>> = {
  string: "Terminals have six hue slots; strings are not one of them.",
  type: "Terminals have six hue slots; types are not one of them.",
  constant: "Terminals have six hue slots; constants are not one of them.",
  variable: "Terminals have no variables; text uses the foreground color.",
  operator: "Terminals have no operators; text uses the foreground color.",
};

/** Where the roles show up in a terminal, with the final (contrast-fixed) colors. */
function uses(input: PortInput): PortUse[] {
  const p = ansiPalette(input);
  const on = p.background;
  return [
    { role: "bg", color: p.background },
    { role: "fg", color: p.foreground, on },
    { role: "accent", color: p.cursor, on },
    { role: "muted", color: p.bright[0], on },
    { role: "error", color: p.normal[1], on },
    { role: "success", color: p.normal[2], on },
    { role: "warning", color: p.normal[3], on },
    { role: "info", color: p.normal[4], on },
    { role: "keyword", color: p.normal[5], on },
    { role: "function", color: p.normal[6], on },
  ];
}

const NAMES = ["black", "red", "green", "yellow", "blue", "purple", "cyan", "white"] as const;
const toml = (s: string) => JSON.stringify(s); // a JSON string is also a valid TOML basic string
const file = (input: PortInput) => slugify(input.name);

function make(
  base: Pick<PortTarget, "id" | "label" | "install">,
  path: (input: PortInput) => string,
  content: (p: AnsiPalette, input: PortInput) => string,
): PortTarget {
  return {
    ...base,
    group: "terminal",
    files: (input) => [{ path: path(input), content: content(ansiPalette(input), input) }],
    uses,
    unused: UNUSED,
  };
}

export const windowsTerminal = make(
  {
    id: "windows-terminal",
    label: "Windows Terminal",
    install:
      'Open Settings, then Open JSON file. Paste the object into the "schemes" list, then set "colorScheme" to the theme name in a profile (or under "defaults").',
  },
  (i) => `${file(i)}.json`,
  (p, i) => {
    const scheme: Record<string, string> = { name: i.name };
    NAMES.forEach((n, k) => (scheme[n] = p.normal[k]));
    NAMES.forEach((n, k) => (scheme["bright" + n[0].toUpperCase() + n.slice(1)] = p.bright[k]));
    Object.assign(scheme, {
      background: p.background,
      foreground: p.foreground,
      cursorColor: p.cursor,
      selectionBackground: p.selection,
    });
    return JSON.stringify(scheme, null, 2) + "\n";
  },
);

export const iterm2 = make(
  {
    id: "iterm2",
    label: "iTerm2",
    install:
      "In iTerm2 open Settings, Profiles, Colors, then Color Presets, Import. Pick the file, then choose the preset.",
  },
  (i) => `${file(i)}.itermcolors`,
  (p) => {
    const entry = (key: string, hex: string) => {
      const [r, g, b] = hexToRgb(hex as `#${string}`).map((v) => (v / 255).toFixed(6));
      return `\t<!-- ${hex} -->
\t<key>${key}</key>
\t<dict>
\t\t<key>Alpha Component</key>
\t\t<real>1</real>
\t\t<key>Blue Component</key>
\t\t<real>${b}</real>
\t\t<key>Color Space</key>
\t\t<string>sRGB</string>
\t\t<key>Green Component</key>
\t\t<real>${g}</real>
\t\t<key>Red Component</key>
\t\t<real>${r}</real>
\t</dict>`;
    };
    const all = [...p.normal, ...p.bright].map((c, k) => entry(`Ansi ${k} Color`, c));
    all.push(
      entry("Background Color", p.background),
      entry("Foreground Color", p.foreground),
      entry("Cursor Color", p.cursor),
      entry("Cursor Text Color", p.background),
      entry("Selection Color", p.selection),
      entry("Selected Text Color", p.foreground),
    );
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
${all.join("\n")}
</dict>
</plist>
`;
  },
);

export const ghostty = make(
  {
    id: "ghostty",
    label: "Ghostty",
    install:
      "Save the file, without an extension, in ~/.config/ghostty/themes/. Then add theme = <file name> to ~/.config/ghostty/config.",
  },
  (i) => file(i),
  (p) =>
    [
      ...[...p.normal, ...p.bright].map((c, k) => `palette = ${k}=${c}`),
      `background = ${p.background}`,
      `foreground = ${p.foreground}`,
      `cursor-color = ${p.cursor}`,
      `cursor-text = ${p.background}`,
      `selection-background = ${p.selection}`,
      `selection-foreground = ${p.foreground}`,
    ].join("\n") + "\n",
);

export const alacritty = make(
  {
    id: "alacritty",
    label: "Alacritty",
    install:
      'Save the file next to alacritty.toml (~/.config/alacritty/). Add general.import = ["<file name>"] to alacritty.toml. Needs Alacritty 0.13 or newer.',
  },
  (i) => `${file(i)}.toml`,
  (p, i) => {
    const row = (list: string[]) => NAMES.map((n, k) => `${n} = ${toml(list[k])}`).join("\n");
    return `# ${i.name.replace(/[\r\n]+/g, " ")}, made with SyntaxHue

[colors.primary]
background = ${toml(p.background)}
foreground = ${toml(p.foreground)}

[colors.cursor]
text = ${toml(p.background)}
cursor = ${toml(p.cursor)}

[colors.selection]
text = ${toml(p.foreground)}
background = ${toml(p.selection)}

[colors.normal]
${row(p.normal)}

[colors.bright]
${row(p.bright)}
`;
  },
);

export const kitty = make(
  {
    id: "kitty",
    label: "Kitty",
    install:
      "Save the file in ~/.config/kitty/. Add include <file name> to kitty.conf, then reload with ctrl+shift+f5.",
  },
  (i) => `${file(i)}.conf`,
  (p, i) =>
    [
      `# ${i.name.replace(/[\r\n]+/g, " ")}, made with SyntaxHue`,
      `foreground ${p.foreground}`,
      `background ${p.background}`,
      `selection_foreground ${p.foreground}`,
      `selection_background ${p.selection}`,
      `cursor ${p.cursor}`,
      `cursor_text_color ${p.background}`,
      ...[...p.normal, ...p.bright].map((c, k) => `color${k} ${c}`),
    ].join("\n") + "\n",
);

export const wezterm = make(
  {
    id: "wezterm",
    label: "WezTerm",
    install:
      "Save the file in ~/.config/wezterm/colors/. In wezterm.lua set config.color_scheme to the theme name. If it is not found, also set config.color_scheme_dirs to that folder.",
  },
  (i) => `${file(i)}.toml`,
  (p, i) => {
    const list = (l: string[]) => `[${l.map(toml).join(", ")}]`;
    return `[colors]
foreground = ${toml(p.foreground)}
background = ${toml(p.background)}
cursor_bg = ${toml(p.cursor)}
cursor_fg = ${toml(p.background)}
cursor_border = ${toml(p.cursor)}
selection_fg = ${toml(p.foreground)}
selection_bg = ${toml(p.selection)}
ansi = ${list(p.normal)}
brights = ${list(p.bright)}

[metadata]
name = ${toml(i.name)}
`;
  },
);

export const warp = make(
  {
    id: "warp",
    label: "Warp",
    install:
      "Save the file in ~/.warp/themes/ (create the folder if it is missing; on Linux it is ~/.local/share/warp-terminal/themes/, on Windows %LOCALAPPDATA%\\warp\\Warp\\data\\themes\\). Then open Settings, Appearance, Themes and pick it from the list.",
  },
  (i) => `${file(i)}.yaml`,
  (p, i) => {
    const q = (hex: string) => `'${hex}'`; // single-quoted so `#` is never read as a comment
    const group = (l: string[]) => NAMES.map((n, k) => `    ${n}: ${q(l[k])}`).join("\n");
    return `# ${i.name.replace(/[\r\n]+/g, " ")}, made with SyntaxHue
name: ${JSON.stringify(i.name.replace(/[\r\n]+/g, " "))}
accent: ${q(p.cursor)}
cursor: ${q(p.cursor)}
background: ${q(p.background)}
foreground: ${q(p.foreground)}
details: ${i.mode === "dark" ? "darker" : "lighter"}
terminal_colors:
  normal:
${group(p.normal)}
  bright:
${group(p.bright)}
`;
  },
);

/** macOS Terminal.app keeps each color as an archived NSColor (a property list inside a `<data>` value). */
function nsColor(hex: Hex): string {
  const rgb = hexToRgb(hex)
    .map((v) => +(v / 255).toFixed(6))
    .join(" ");
  const rgbData = btoa(rgb + "\0");
  const uid = (n: number) => `<dict><key>CF$UID</key><integer>${n}</integer></dict>`;
  const archive = `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict><key>$archiver</key><string>NSKeyedArchiver</string><key>$objects</key><array><string>$null</string><dict><key>NSColorSpace</key><integer>2</integer><key>NSRGB</key><data>${rgbData}</data><key>$class</key>${uid(2)}</dict><dict><key>$classname</key><string>NSColor</string><key>$classes</key><array><string>NSColor</string><string>NSObject</string></array></dict></array><key>$top</key><dict><key>root</key>${uid(1)}</dict><key>$version</key><integer>100000</integer></dict></plist>`;
  return btoa(archive);
}

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const cap = (n: string) => n[0].toUpperCase() + n.slice(1);

export const macTerminal = make(
  {
    id: "macos-terminal",
    label: "Terminal (macOS)",
    install:
      "Save the file, then double-click it: Terminal imports it as a new profile named after the theme and opens a window with it. To make it the default, open Terminal, Settings, Profiles, select it, then Default.",
  },
  (i) => `${file(i)}.terminal`,
  (p, i) => {
    const entry = (key: string, hex: Hex) => `\t<!-- ${hex} -->\n\t<key>${key}</key>\n\t<data>${nsColor(hex)}</data>`;
    const colors = [
      entry("BackgroundColor", p.background),
      entry("TextColor", p.foreground),
      entry("TextBoldColor", p.foreground),
      entry("CursorColor", p.cursor),
      entry("SelectionColor", p.selection),
      ...NAMES.map((n, k) => entry(`ANSI${cap(n === "purple" ? "magenta" : n)}Color`, p.normal[k])),
      ...NAMES.map((n, k) => entry(`ANSIBright${cap(n === "purple" ? "magenta" : n)}Color`, p.bright[k])),
    ];
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>name</key>
\t<string>${xml(i.name.replace(/[\r\n]+/g, " "))}</string>
\t<key>type</key>
\t<string>Window Settings</string>
\t<key>ProfileCurrentVersion</key>
\t<real>2.09</real>
${colors.join("\n")}
</dict>
</plist>
`;
  },
);

export const TERMINALS: PortTarget[] = [windowsTerminal, iterm2, ghostty, alacritty, kitty, wezterm, warp, macTerminal];
