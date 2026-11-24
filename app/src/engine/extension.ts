import { themeFile } from "./derive";
import { ROLES, type ThemeState } from "./theme";
import { effectiveTheme } from "./vibe";

/**
 * A color theme packaged as a VS Code extension: the files that go into the `.vsix` (HP-1102) and onto the
 * Marketplace. Everything here is plain data in, plain text out, so it is deterministic and easy to test.
 */

export type LicenseId = "MIT" | "ISC" | "Unlicense";
export const LICENSES: LicenseId[] = ["MIT", "ISC", "Unlicense"];

export interface ExtensionOptions {
  /** Marketplace publisher id, e.g. "nathaliemaes". Required; the Marketplace rejects a package without one. */
  publisher: string;
  /** Extension id (the `name` field). Defaults to the theme name as a slug. */
  id?: string;
  /** Name shown in the Marketplace and the extensions list. Defaults to the theme name. */
  displayName?: string;
  version: string;
  description: string;
  license: LicenseId;
  /** Name in the LICENSE file. */
  author: string;
  year: number;
  keywords?: string[];
  /** Repository URL; the Marketplace page links it, and `vsce` warns when it is missing. */
  repository?: string;
}

/** Lowercase letters, digits and hyphens: the form the Marketplace accepts for ids. */
export function slugify(text: string, fallback = "theme"): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback
  );
}

const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const SEMVER_RE = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

export type Field = "publisher" | "id" | "displayName" | "version" | "description" | "author" | "repository";

/** What is wrong, by field, in plain words. Empty when the package would be accepted. */
export function fieldProblems(theme: ThemeState, o: ExtensionOptions): Partial<Record<Field, string>> {
  const p: Partial<Record<Field, string>> = {};
  const id = o.id ?? slugify(theme.name);
  if (!o.publisher) p.publisher = "Enter your publisher id.";
  else if (!ID_RE.test(o.publisher))
    p.publisher = "The publisher id may only use lowercase letters, digits and hyphens.";
  if (!id) p.id = "Enter an extension id.";
  else if (!ID_RE.test(id)) p.id = "The extension id may only use lowercase letters, digits and hyphens.";
  else if (id.length > 64) p.id = "The extension id is longer than 64 characters.";
  if (!(o.displayName ?? theme.name).trim()) p.displayName = "The extension needs a name.";
  if (!SEMVER_RE.test(o.version)) p.version = "The version must look like 1.0.0.";
  if (!o.description.trim()) p.description = "Add a short description; it is the line under the name in search.";
  if (!o.author.trim()) p.author = "Enter the name for the license.";
  if (o.repository && !/^https?:\/\//.test(o.repository)) p.repository = "The repository must be a web address.";
  return p;
}

/** Problems that would make the Marketplace refuse the package, as a list of messages. Empty when it is fine. */
export function validateOptions(theme: ThemeState, o: ExtensionOptions): string[] {
  return Object.values(fieldProblems(theme, o));
}

/** Things worth fixing that do not stop the package from being built. */
export function advice(o: ExtensionOptions): string[] {
  const tips: string[] = [];
  if (!o.repository)
    tips.push("No repository: the Marketplace page will have no link to the source, and vsce warns about it.");
  if (o.description.length > 160)
    tips.push("The description is long; search results cut it off after about 160 characters.");
  return tips;
}

/** "a, B ,a" becomes ["a", "b"]. */
export function parseKeywords(text: string): string[] {
  return [
    ...new Set(
      text
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export function themePath(id: string): string {
  return `themes/${id}-color-theme.json`;
}

export function packageJson(theme: ThemeState, o: ExtensionOptions) {
  const id = o.id ?? slugify(theme.name);
  return {
    name: id,
    displayName: o.displayName?.trim() || theme.name,
    description: o.description,
    version: o.version,
    publisher: o.publisher,
    license: o.license,
    engines: { vscode: "^1.75.0" },
    categories: ["Themes"],
    keywords: [...new Set(["theme", "color-theme", theme.mode, ...(o.keywords ?? [])])],
    ...(o.repository ? { repository: { type: "git", url: o.repository } } : {}),
    contributes: {
      themes: [
        {
          label: theme.name,
          uiTheme: theme.mode === "dark" ? "vs-dark" : "vs",
          path: `./${themePath(id)}`,
        },
      ],
    },
  };
}

export function licenseText(o: Pick<ExtensionOptions, "license" | "author" | "year">): string {
  const head = `Copyright (c) ${o.year} ${o.author}`;
  switch (o.license) {
    case "MIT":
      return `MIT License

${head}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
    case "ISC":
      return `ISC License

${head}

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
`;
    case "Unlicense":
      return `This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or distribute
this software, either in source code form or as a compiled binary, for any
purpose, commercial or non-commercial, and by any means.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.

For more information, please refer to <https://unlicense.org>
`;
  }
}

export function changelog(theme: ThemeState, o: Pick<ExtensionOptions, "version">): string {
  return `# Changelog

## ${o.version}

- First release of ${theme.name}.
`;
}

/** The README the Marketplace shows: what it is, how to turn it on, and the palette it is built from. */
export function readme(theme: ThemeState, o: ExtensionOptions): string {
  const shown = effectiveTheme(theme);
  const rows = ROLES.map((r) => `| ${r.label} | \`${shown.roles[r.id].color}\` |`).join("\n");
  return `# ${o.displayName?.trim() || theme.name}

${o.description}

A ${theme.mode} color theme for Visual Studio Code.

## Use it

1. Install the extension.
2. Open the Command Palette (\`Ctrl+Shift+P\` / \`Cmd+Shift+P\`) and run **Preferences: Color Theme**.
3. Pick **${theme.name}**.

## Palette

| Role | Color |
| --- | --- |
${rows}

Text colors are kept at or above WCAG contrast minimums against the background.

## License

${o.license}. See the LICENSE file.

Made with [Hueprint](https://hueprint.nathaliemaes.be).
`;
}

const VSCODEIGNORE = `.vscode/**
.vscode-test/**
**/*.map
.gitignore
`;

/** Every file of the extension, by path inside the package. Throws when the options are not valid. */
export function extensionFiles(theme: ThemeState, o: ExtensionOptions): Record<string, string> {
  const problems = validateOptions(theme, o);
  if (problems.length) throw new Error(problems.join(" "));
  const id = o.id ?? slugify(theme.name);
  return {
    "package.json": JSON.stringify(packageJson(theme, o), null, 2) + "\n",
    [themePath(id)]: JSON.stringify(themeFile(theme), null, 2) + "\n",
    "README.md": readme(theme, o),
    "CHANGELOG.md": changelog(theme, o),
    LICENSE: licenseText(o),
    ".vscodeignore": VSCODEIGNORE,
  };
}
