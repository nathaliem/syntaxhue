import { describe, expect, it } from "vitest";
import { themeFile, settingsSnippet } from "./derive";
import { importTheme, parseJsonc, MAX_IMPORT_BYTES, type ImportFile } from "./importTheme";
import { contrastIssues, generate, ROLE_IDS, type ThemeState } from "./theme";

const raw = import.meta.glob("./__fixtures__/themes/*.json", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const fixture = (name: string): ImportFile => ({
  name: `${name}.json`,
  text: raw[`./__fixtures__/themes/${name}.json`],
});
const file = (obj: unknown, name = "t.json"): ImportFile => ({ name, text: JSON.stringify(obj) });
const ok = (r: ReturnType<typeof importTheme>) => {
  if (!r.ok) throw new Error(r.error);
  return r;
};
const colors = (t: ThemeState) => Object.fromEntries(ROLE_IDS.map((id) => [id, t.roles[id].color]));

describe("parseJsonc", () => {
  it("accepts comments and trailing commas, and leaves strings alone", () => {
    const v = parseJsonc('﻿{ // line\n "a": "x // not a comment", /* block */ "b": [1, 2,], }');
    expect(v).toEqual({ a: "x // not a comment", b: [1, 2] });
  });
  it("still rejects broken JSON", () => {
    expect(() => parseJsonc("{ nope")).toThrow();
  });
});

describe("importTheme: round trip", () => {
  it.each([
    [7, "dark"],
    [11, "light"],
    [23, "dark"],
  ] as const)("a generated theme (seed %i, %s) comes back with the same 15 colors", (seed, mode) => {
    const original = { ...generate(seed, mode), name: "Round Trip" };
    const out = ok(importTheme([file(themeFile(original), "rt-color-theme.json")]));
    expect(out.theme.mode).toBe(mode);
    expect(out.theme.name).toBe("Round Trip (imported)");
    expect(colors(out.theme)).toEqual(colors(original));
    expect(out.theme.roles.keyword.fontStyle).toEqual(original.roles.keyword.fontStyle);
    expect(out.notes.join(" ")).not.toMatch(/filled in/);
  });

  it("reads the same colors from a settings.json snippet", () => {
    const original = generate(7, "dark");
    const out = ok(importTheme([file(settingsSnippet(original, true), "settings.json")]));
    expect(colors(out.theme)).toEqual(colors(original));
  });
});

describe("importTheme: real VS Code themes", () => {
  it("imports Dark+ with its include, resolving the base file", () => {
    const out = ok(importTheme([fixture("dark_plus"), fixture("dark_vs")]));
    expect(out.theme.mode).toBe("dark");
    expect(out.theme.name).toBe("Dark+ (imported)");
    expect(out.theme.roles.bg.color).toBe("#1e1e1e");
    expect(out.theme.roles.fg.color).toBe("#d4d4d4");
    expect(out.theme.roles.keyword.color).toBe("#569cd6");
    expect(out.theme.roles.string.color).toBe("#ce9178");
    expect(out.theme.roles.function.color).toBe("#dcdcaa");
    expect(out.theme.roles.type.color).toBe("#4ec9b0");
    expect(out.theme.roles.constant.color).toBe("#b5cea8");
    expect(out.theme.roles.muted.color).toBe("#6a9955");
    expect(out.notes.join(" ")).not.toMatch(/extends/);
  });

  it("picks the main theme itself when the files are given in any order", () => {
    const a = ok(importTheme([fixture("dark_vs"), fixture("dark_plus")]));
    expect(a.theme.name).toBe("Dark+ (imported)");
  });

  it("imports Light+ as a light theme", () => {
    const out = ok(importTheme([fixture("light_plus"), fixture("light_vs")]));
    expect(out.theme.mode).toBe("light");
    expect(out.theme.roles.bg.color).toBe("#ffffff");
    expect(out.theme.roles.keyword.color).toBe("#0000ff");
    expect(out.theme.roles.function.color).toBe("#795e26");
  });

  it("imports the base file on its own", () => {
    const out = ok(importTheme([fixture("dark_vs")]));
    expect(out.theme.roles.bg.color).toBe("#1e1e1e");
  });

  it("says so when an included file is missing, and still imports what is there", () => {
    const out = ok(importTheme([fixture("dark_plus")]));
    expect(out.notes.join(" ")).toMatch(/extends dark_vs\.json/);
    expect(out.theme.roles.function.color).toBe("#dcdcaa");
  });
});

describe("importTheme: mapping", () => {
  const base = { name: "Mini", colors: { "editor.background": "#101010", "editor.foreground": "#eeeeee" } };

  it("uses the most specific matching scope, with later rules winning ties", () => {
    const t = ok(
      importTheme([
        file({
          ...base,
          tokenColors: [
            { scope: "keyword", settings: { foreground: "#111111" } },
            { scope: "keyword.control", settings: { foreground: "#222222" } },
            { scope: ["storage", "keyword.control"], settings: { foreground: "#333333" } },
          ],
        }),
      ]),
    ).theme;
    expect(t.roles.keyword.color).toBe("#333333");
  });

  it("splits comma separated scopes and ignores descendant selectors", () => {
    const t = ok(
      importTheme([
        file({
          ...base,
          tokenColors: [
            { scope: "string, comment", settings: { foreground: "#aa0000", fontStyle: "italic bold" } },
            { scope: "source.ts string", settings: { foreground: "#00aa00" } },
          ],
        }),
      ]),
    ).theme;
    expect(t.roles.string.color).toBe("#aa0000");
    expect(t.roles.muted.fontStyle).toEqual(["italic", "bold"]);
  });

  it("accepts short and alpha hex colors and drops the alpha", () => {
    const t = ok(
      importTheme([
        file({ colors: { "editor.background": "#fff", "editor.foreground": "#112233cc" }, tokenColors: [] }),
      ]),
    ).theme;
    expect(t.roles.bg.color).toBe("#ffffff");
    expect(t.roles.fg.color).toBe("#112233");
    expect(t.mode).toBe("light");
  });

  it("takes the mode from `type`, else from the background", () => {
    expect(ok(importTheme([file({ ...base, type: "light" })])).theme.mode).toBe("light");
    expect(ok(importTheme([file({ ...base, type: "hc-black" })])).theme.mode).toBe("dark");
    expect(ok(importTheme([file({ colors: { "editor.background": "#fafafa" } })])).theme.mode).toBe("light");
  });

  it("fills in missing roles from a generated palette and keeps those readable", () => {
    const out = ok(importTheme([file(base)]));
    expect(out.notes.join(" ")).toMatch(/no color for .*Keyword.* filled in/);
    expect(out.theme.roles.bg.color).toBe("#101010");
    expect(contrastIssues(out.theme).map((i) => i.role)).not.toContain("keyword");
    // deterministic
    expect(ok(importTheme([file(base)])).theme).toEqual(out.theme);
  });

  it("keeps the imported colors as they are, even when they are hard to read", () => {
    const t = ok(
      importTheme([file({ ...base, tokenColors: [{ scope: "keyword", settings: { foreground: "#141414" } }] })]),
    ).theme;
    expect(t.roles.keyword.color).toBe("#141414");
    expect(contrastIssues(t).map((i) => i.role)).toContain("keyword");
  });

  it("mentions semantic token colors that aren't carried over", () => {
    const out = ok(importTheme([file({ ...base, semanticTokenColors: { class: "#ff0000" } })]));
    expect(out.notes.join(" ")).toMatch(/semantic token colors/);
  });
});

describe("importTheme: bad input", () => {
  it.each([
    [{ name: "x.json", text: "{ nope" }, /isn't valid JSON/],
    [{ name: "x.json", text: "[1,2]" }, /expected a JSON object/],
    [{ name: "x.json", text: '{"name":"empty"}' }, /doesn't look like a VS Code color theme/],
    [{ name: "x.json", text: "x".repeat(MAX_IMPORT_BYTES + 1) }, /too large/],
  ])("explains %#", (f, message) => {
    const r = importTheme([f]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(message);
  });

  it("asks for a file when there is none", () => {
    expect(importTheme([]).ok).toBe(false);
  });

  it("survives hostile keys and a circular include", () => {
    const hostile =
      '{"__proto__":{"polluted":1},"colors":{"__proto__":"#ffffff","editor.background":"#000000"},"tokenColors":[]}';
    ok(importTheme([{ name: "h.json", text: hostile }]));
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    const a = { name: "A", include: "./b.json", colors: { "editor.background": "#000000" } };
    const b = { name: "B", include: "./a.json", colors: { "editor.foreground": "#ffffff" } };
    const r = importTheme([file(a, "a.json"), file(b, "b.json")]);
    expect(r.ok).toBe(true);
  });
});
