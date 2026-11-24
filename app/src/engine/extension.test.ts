import { describe, expect, it } from "vitest";
import { themeFile } from "./derive";
import {
  advice,
  extensionFiles,
  fieldProblems,
  parseKeywords,
  licenseText,
  LICENSES,
  packageJson,
  readme,
  slugify,
  themePath,
  validateOptions,
  type ExtensionOptions,
} from "./extension";
import { generate, ROLES } from "./theme";

const opts: ExtensionOptions = {
  publisher: "someone",
  version: "1.0.0",
  description: "A calm green theme.",
  license: "MIT",
  author: "Some One",
  year: 2026,
};
const dark = { ...generate(7, "dark"), name: "Velvet Meadow" };
const light = { ...generate(7, "light"), name: "Velvet Meadow" };

describe("slugify", () => {
  it("makes ids the Marketplace accepts", () => {
    expect(slugify("Velvet Meadow")).toBe("velvet-meadow");
    expect(slugify("  Café — Nöir!! ")).toBe("cafe-noir");
    expect(slugify("日本語")).toBe("theme");
    expect(slugify("", "x")).toBe("x");
  });
});

describe("package.json", () => {
  it("declares one theme that points at the theme file", () => {
    const p = packageJson(dark, opts);
    expect(p.name).toBe("velvet-meadow");
    expect(p.displayName).toBe("Velvet Meadow");
    expect(p.publisher).toBe("someone");
    expect(p.categories).toEqual(["Themes"]);
    expect(p.engines.vscode).toMatch(/^\^1\.\d+\.\d+$/);
    expect(p.contributes.themes).toEqual([
      { label: "Velvet Meadow", uiTheme: "vs-dark", path: "./themes/velvet-meadow-color-theme.json" },
    ]);
  });

  it("uses vs for light themes and an explicit id when given", () => {
    const p = packageJson(light, { ...opts, id: "meadow" });
    expect(p.name).toBe("meadow");
    expect(p.contributes.themes[0].uiTheme).toBe("vs");
    expect(p.contributes.themes[0].path).toBe("./themes/meadow-color-theme.json");
  });

  it("adds the repository only when there is one, and de-duplicates keywords", () => {
    expect(packageJson(dark, opts)).not.toHaveProperty("repository");
    const p = packageJson(dark, { ...opts, repository: "https://github.com/a/b", keywords: ["dark", "green"] });
    expect(p.repository).toEqual({ type: "git", url: "https://github.com/a/b" });
    expect(p.keywords).toEqual(["theme", "color-theme", "dark", "green"]);
  });
});

describe("validateOptions", () => {
  it("accepts good options", () => expect(validateOptions(dark, opts)).toEqual([]));
  it.each([
    [{ publisher: "Some One" }, /publisher id/],
    [{ id: "Bad_ID" }, /extension id/],
    [{ id: "a".repeat(65) }, /64 characters/],
    [{ version: "1.0" }, /version/],
    [{ description: "  " }, /description/],
    [{ repository: "github.com/a/b" }, /web address/],
  ])("refuses %j", (change, message) => {
    expect(validateOptions(dark, { ...opts, ...change }).join(" ")).toMatch(message);
  });
  it("refuses a theme with no name", () => {
    expect(validateOptions({ ...dark, name: " " }, opts).join(" ")).toMatch(/name/);
  });
});

describe("extensionFiles", () => {
  const files = extensionFiles(dark, opts);

  it("has everything a Marketplace package needs, and the path in package.json exists", () => {
    expect(Object.keys(files).sort()).toEqual(
      [".vscodeignore", "CHANGELOG.md", "LICENSE", "README.md", "package.json", themePath("velvet-meadow")].sort(),
    );
    const pkg = JSON.parse(files["package.json"]);
    expect(files[pkg.contributes.themes[0].path.replace("./", "")]).toBeDefined();
  });

  it("ships the same theme file the download button writes", () => {
    expect(JSON.parse(files[themePath("velvet-meadow")])).toEqual(themeFile(dark));
  });

  it("is deterministic", () => {
    expect(extensionFiles(dark, opts)).toEqual(files);
  });

  it("refuses invalid options instead of writing a package the Marketplace would reject", () => {
    expect(() => extensionFiles(dark, { ...opts, publisher: "" })).toThrow(/publisher/);
  });
});

describe("README and license", () => {
  it("README names the theme, how to enable it, and lists every role's color", () => {
    const text = readme(dark, opts);
    expect(text).toContain("# Velvet Meadow");
    expect(text).toContain("Preferences: Color Theme");
    for (const r of ROLES) expect(text).toContain(`| ${r.label} |`);
    expect(text).toMatch(/`#[0-9a-f]{6}`/);
  });
  it.each(LICENSES)("%s license carries the year and author", (license) => {
    const text = licenseText({ license, author: "Some One", year: 2026 });
    expect(text).toContain(license === "Unlicense" ? "public domain" : "2026 Some One");
  });
});

describe("fieldProblems", () => {
  it("says which field is wrong, and nothing for good options", () => {
    expect(fieldProblems(dark, opts)).toEqual({});
    const p = fieldProblems(dark, { ...opts, publisher: "", version: "x", author: " ", description: "" });
    expect(Object.keys(p).sort()).toEqual(["author", "description", "publisher", "version"]);
    expect(fieldProblems(dark, { ...opts, id: "" }).id).toMatch(/Enter an extension id/);
    expect(fieldProblems(dark, { ...opts, displayName: "  " }).displayName).toMatch(/needs a name/);
  });
});

describe("display name", () => {
  it("overrides the theme name in the package and README, but not the theme label", () => {
    const o = { ...opts, displayName: "Meadow Dark" };
    expect(packageJson(dark, o).displayName).toBe("Meadow Dark");
    expect(packageJson(dark, o).contributes.themes[0].label).toBe("Velvet Meadow");
    expect(readme(dark, o)).toMatch(/^# Meadow Dark/);
    expect(packageJson(dark, { ...opts, displayName: " " }).displayName).toBe("Velvet Meadow");
  });
});

describe("advice and keywords", () => {
  it("nudges about a missing repository and a long description, without blocking", () => {
    expect(advice(opts).join(" ")).toMatch(/repository/);
    expect(advice({ ...opts, repository: "https://x.y", description: "x".repeat(161) }).join(" ")).toMatch(/long/);
    expect(advice({ ...opts, repository: "https://x.y" })).toEqual([]);
  });
  it("parses comma separated keywords, lowercased and de-duplicated", () => {
    expect(parseKeywords(" Green, calm ,GREEN,, ")).toEqual(["green", "calm"]);
    expect(parseKeywords("")).toEqual([]);
  });
});
