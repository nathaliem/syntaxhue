import type { Lang } from "./highlight";

/**
 * One sample file per language for the preview. Line numbers are 1-based. `select` is the word selected on the
 * cursor line, `errorWord` the word with the squiggle on `error`; a test checks each one is really a token there.
 */
export interface Sample {
  lang: Lang;
  /** Short name on the switcher button. */
  label: string;
  /** Name in the status bar. */
  name: string;
  file: string;
  /** Last item of the breadcrumb. */
  crumb: string;
  code: string;
  cursor: number;
  select: string;
  error: number;
  errorWord: string;
  /** Gutter marks: lines changed since the last commit. */
  modified: number[];
  added: number[];
  hover: { signature: string; error: string };
}

export const SAMPLES: Sample[] = [
  {
    lang: "typescript",
    label: "TS",
    name: "TypeScript",
    file: "shuffle.ts",
    crumb: "shuffle",
    code: `// Pick colors that stay readable on any background
import { contrast, oklch } from "./color";

export type Role = "keyword" | "string" | "type";

interface Palette {
  name: string;
  roles: Map<Role, string>;
  locked: boolean;
}

const MIN_CONTRAST = 4.5;

export async function shuffle(seed: number): Promise<Palette> {
  const hue = (seed * 137.5) % 360;
  const bg = oklch(0.21, 0.02, hue);
  if (contrast(fg, bg) < MIN_CONTRAST) {
    return lighten(fg, 0.05);
  }
  return { name: \`Theme \${seed}\`, roles: new Map(), locked: false };
}`,
    cursor: 16,
    select: "bg",
    error: 18,
    errorWord: "lighten",
    modified: [16, 17, 18],
    added: [12],
    hover: { signature: "function lighten(hex: string): string", error: "Cannot find name 'lighten'. ts(2304)" },
  },
  {
    lang: "python",
    label: "Python",
    name: "Python",
    file: "shuffle.py",
    crumb: "shuffle",
    code: `# Pick colors that stay readable on any background
from dataclasses import dataclass
from color import contrast, oklch

MIN_CONTRAST = 4.5


@dataclass
class Palette:
    name: str
    roles: dict[str, str]
    locked: bool = False


async def shuffle(seed: int) -> Palette:
    """Return a palette that passes contrast checks."""
    hue = (seed * 137.5) % 360
    bg = oklch(0.21, 0.02, hue)
    if contrast(fg, bg) < MIN_CONTRAST:
        return lighten(fg, 0.05)
    return Palette(name=f"Theme {seed}", roles={}, locked=False)`,
    cursor: 18,
    select: "bg",
    error: 20,
    errorWord: "lighten",
    modified: [18, 19, 20],
    added: [12],
    hover: { signature: "def lighten(color: str, amount: float) -> str", error: '"lighten" is not defined. Pylance' },
  },
  {
    lang: "rust",
    label: "Rust",
    name: "Rust",
    file: "shuffle.rs",
    crumb: "shuffle",
    code: `// Pick colors that stay readable on any background
use crate::color::{contrast, oklch};

const MIN_CONTRAST: f64 = 4.5;

#[derive(Debug, Clone)]
pub struct Palette {
    pub name: String,
    pub roles: Vec<(Role, String)>,
    pub locked: bool,
}

pub fn shuffle(seed: u32) -> Option<Palette> {
    let hue = (seed as f64 * 137.5) % 360.0;
    let bg = oklch(0.21, 0.02, hue);
    if contrast(&fg, &bg) < MIN_CONTRAST {
        return lighten(&fg, 0.05);
    }
    Some(Palette { name: format!("Theme {seed}"), roles: vec![], locked: false })
}`,
    cursor: 15,
    select: "bg",
    error: 17,
    errorWord: "lighten",
    modified: [15, 16, 17],
    added: [10],
    hover: {
      signature: "fn lighten(color: &str, amount: f64) -> String",
      error: "cannot find function `lighten` in this scope. rustc E0425",
    },
  },
  {
    lang: "go",
    label: "Go",
    name: "Go",
    file: "shuffle.go",
    crumb: "Shuffle",
    code: `// Pick colors that stay readable on any background
package palette

import (
	"fmt"
	"math"
)

const MinContrast = 4.5

type Palette struct {
	Name   string
	Roles  map[string]string
	Locked bool
}

func Shuffle(seed int) (*Palette, error) {
	hue := math.Mod(float64(seed)*137.5, 360)
	bg := Oklch(0.21, 0.02, hue)
	if Contrast(fg, bg) < MinContrast {
		return Lighten(fg, 0.05)
	}
	return &Palette{Name: fmt.Sprintf("Theme %d", seed)}, nil
}`,
    cursor: 19,
    select: "bg",
    error: 21,
    errorWord: "Lighten",
    modified: [19, 20, 21],
    added: [14],
    hover: { signature: "func Lighten(hex string, amount float64) string", error: "undefined: Lighten. compiler" },
  },
  {
    lang: "html",
    label: "HTML",
    name: "HTML",
    file: "index.html",
    crumb: "button",
    code: `<!-- Pick colors that stay readable on any background -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>SyntaxHue</title>
    <link rel="stylesheet" href="/theme.css" />
  </head>
  <body class="dark">
    <main id="app">
      <h1 class="title">Pick a palette</h1>
      <button type="button" data-action="shuffle" disabled>
        Shuffle 14 colors
      </button>
      <p>Contrast <strong>4.5</strong> or better.</p>
    </main>
    <script type="module" src="/main.js"></script>
  </body>
</html>`,
    cursor: 13,
    select: "Shuffle 14 colors",
    error: 12,
    errorWord: "disabled",
    modified: [12, 13, 14],
    added: [6],
    hover: { signature: '<button type="button">', error: "Disabled button has no explanation. html-validate" },
  },
  {
    lang: "css",
    label: "CSS",
    name: "CSS",
    file: "theme.css",
    crumb: ".title",
    code: `/* Pick colors that stay readable on any background */
:root {
  --bg: #0b1020;
  --fg: #e6e9f2;
  --accent: #4ba3f7;
  --min-contrast: 4.5;
}

.title {
  color: var(--fg);
  font: 600 1.25rem/1.4 "Inter", sans-serif;
  background: linear-gradient(90deg, var(--bg), var(--accent));
  padding: 12px 16px;
}

button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}`,
    cursor: 13,
    select: "padding",
    error: 17,
    errorWord: "opacity",
    modified: [12, 13, 14],
    added: [6],
    hover: { signature: "opacity: 0.4", error: "Disabled controls need 3:1 contrast. stylelint" },
  },
  {
    lang: "json",
    label: "JSON",
    name: "JSON",
    file: "theme.json",
    crumb: "tokenColors",
    code: `{
  "name": "Velvet Meadow",
  "type": "dark",
  "colors": {
    "editor.background": "#0b1020",
    "editor.foreground": "#e6e9f2",
    "statusBar.background": "#4ba3f7"
  },
  "tokenColors": [
    {
      "scope": ["comment"],
      "settings": { "foreground": "#6f848f", "fontStyle": "italic" }
    },
    {
      "scope": ["keyword", "storage"],
      "settings": { "foreground": "#4ba3f7" }
    },
    {
      "scope": "string",
      "settings": { "foreground": "#594199" }
    }
  ]
}`,
    cursor: 16,
    select: "foreground",
    error: 20,
    errorWord: "#594199",
    modified: [16, 17, 18],
    added: [7],
    hover: { signature: '"foreground": string', error: "Color is below 4.5:1 contrast. syntaxhue" },
  },
  {
    lang: "markdown",
    label: "MD",
    name: "Markdown",
    file: "README.md",
    crumb: "Features",
    code: `# SyntaxHue

Pick colors that stay **readable** on any background.

## Features

- Shuffle a whole palette in one click
- Lock the colors you like
- Export a \`settings.json\` snippet
- See [contrast](https://syntaxhue.nathaliemaes.be) at a glance

## Run it

Start with \`npm run dev\`, then open the app.

> Free and made by one person.
> Buy me a coffee.`,
    cursor: 9,
    select: "settings.json",
    error: 10,
    errorWord: "contrast",
    modified: [8, 9, 10],
    added: [14],
    hover: {
      signature: "[contrast](https://syntaxhue.nathaliemaes.be)",
      error: "Link text should describe the destination. markdownlint",
    },
  },
];

export const DEFAULT_SAMPLE = SAMPLES[0];

export function sampleFor(lang: Lang): Sample {
  return SAMPLES.find((s) => s.lang === lang) ?? DEFAULT_SAMPLE;
}
