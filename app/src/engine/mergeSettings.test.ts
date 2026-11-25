import { describe, expect, it } from "vitest";
import { mergeSettings } from "./mergeSettings";
import { parseJsonc } from "./importTheme";
import { generate } from "./theme";

const theme = generate(7, "dark");
const KEYS = [
  "workbench.colorTheme",
  "workbench.colorCustomizations",
  "editor.tokenColorCustomizations",
  "editor.semanticTokenColorCustomizations",
];

function run(text: string, scoped = true) {
  const r = mergeSettings(text, theme, scoped);
  if (!r.ok) throw new Error(r.error);
  return r;
}
const count = (text: string, key: string) => text.split(`"${key}"`).length - 1;

describe("merge mode", () => {
  it("adds all four keys to an empty file and gives valid settings", () => {
    const { text } = run("");
    const parsed = parseJsonc(text) as Record<string, unknown>;
    for (const k of KEYS) expect(parsed).toHaveProperty([k]);
  });

  it("keeps the user's other settings, comments, order and indent", () => {
    const input = `{\n    // my font\n    "editor.fontSize": 15, // big\n    "files.autoSave": "afterDelay"\n}\n`;
    const { text } = run(input);
    expect(text).toContain("// my font");
    expect(text).toContain('"editor.fontSize": 15, // big');
    expect(text).toContain('    "workbench.colorTheme"');
    const parsed = parseJsonc(text) as Record<string, unknown>;
    expect(parsed["files.autoSave"]).toBe("afterDelay");
    expect(parsed["editor.fontSize"]).toBe(15);
  });

  it("never duplicates keys, however many times it is merged", () => {
    const once = run(`{ "editor.fontSize": 14 }`).text;
    const twice = run(once).text;
    for (const k of KEYS) expect(count(twice, k)).toBe(1);
    expect(parseJsonc(twice)).toEqual(parseJsonc(once));
  });

  it("merges into existing customizations and keeps the user's own colors and rules", () => {
    const input = JSON.stringify({
      "workbench.colorTheme": "Monokai",
      "workbench.colorCustomizations": {
        "statusBar.background": "#123456",
        "[Default Dark Modern][Dark Modern]": { "my.color": "#abcdef" },
      },
      "editor.tokenColorCustomizations": {
        "[Default Dark Modern][Dark Modern]": {
          textMateRules: [{ scope: "my.scope", settings: { foreground: "#111111" } }],
        },
      },
    });
    const parsed = parseJsonc(run(input).text) as Record<string, Record<string, Record<string, unknown>>>;
    expect(parsed["workbench.colorTheme"]).toBe("Default Dark Modern");
    expect(parsed["workbench.colorCustomizations"]["statusBar.background"]).toBe("#123456");
    const scoped = parsed["workbench.colorCustomizations"]["[Default Dark Modern][Dark Modern]"];
    expect(scoped["my.color"]).toBe("#abcdef");
    expect(Object.keys(scoped).length).toBeGreaterThan(5);
    const rules = parsed["editor.tokenColorCustomizations"]["[Default Dark Modern][Dark Modern]"].textMateRules as {
      scope: unknown;
    }[];
    expect(rules.some((r) => r.scope === "my.scope")).toBe(true);
    expect(rules.length).toBeGreaterThan(3);
  });

  it("replaces a rule with the same scope instead of repeating it", () => {
    const first = run("{}").text;
    const parsed = parseJsonc(first) as Record<string, Record<string, { textMateRules: { scope: unknown }[] }>>;
    const rules = parsed["editor.tokenColorCustomizations"]["[Default Dark Modern][Dark Modern]"].textMateRules;
    const again = parseJsonc(run(first).text) as typeof parsed;
    expect(again["editor.tokenColorCustomizations"]["[Default Dark Modern][Dark Modern]"].textMateRules).toHaveLength(
      rules.length,
    );
  });

  it("handles trailing commas and comments after the last property", () => {
    const { text } = run(`{\n  "a": 1, // note\n}`);
    expect(() => parseJsonc(text)).not.toThrow();
    expect(text).toContain("// note");
  });

  it("works unscoped", () => {
    const parsed = parseJsonc(run("{}", false).text) as Record<string, Record<string, unknown>>;
    expect(parsed["workbench.colorCustomizations"]).not.toHaveProperty(["[Default Dark Modern][Dark Modern]"]);
  });

  it("notes duplicate keys and dropped comments", () => {
    const r = run(
      `{ "workbench.colorCustomizations": { /* mine */ "a": "#000000" }, "workbench.colorCustomizations": {} }`,
    );
    expect(r.notes.join(" ")).toMatch(/appeared 2 times/);
    const c = run(`{ "workbench.colorCustomizations": { /* mine */ "a": "#000000" } }`);
    expect(c.notes.join(" ")).toMatch(/Comments inside/);
  });

  it("refuses input that isn't a settings object, and changes nothing", () => {
    for (const bad of ["[1,2]", "hello", `{ "a": 1 `, `{ "a": }`]) expect(mergeSettings(bad, theme).ok).toBe(false);
  });
});

/** VS Code's own rule for whether a "[…]" key applies to a theme (copied from its source, so we notice if it changes). */
function scopeApplies(key: string, settingsId: string): boolean {
  return (key.match(/\[(.+?)\]/g) ?? []).some((m) => {
    const o = m.slice(1, -1);
    const [e, t] = [o.charAt(0), o.charAt(o.length - 1)];
    return (
      o === settingsId ||
      (settingsId.includes(o.slice(1, -1)) && e === "*" && t === "*") ||
      (settingsId.startsWith(o.slice(0, -1)) && t === "*") ||
      (settingsId.endsWith(o.slice(1)) && e === "*")
    );
  });
}

describe("works under both the old and the new name of the built-in theme", () => {
  it("the scope applies to 'Default Dark Modern' (older VS Code) and 'Dark Modern' (newer)", () => {
    const key = Object.keys((parseJsonc(run("{}").text) as Record<string, object>)["workbench.colorCustomizations"])[0];
    expect(scopeApplies(key, "Default Dark Modern")).toBe(true);
    expect(scopeApplies(key, "Dark Modern")).toBe(true);
    expect(scopeApplies(key, "Light Modern")).toBe(false);
    expect(scopeApplies("[Default Dark Modern]", "Dark Modern")).toBe(false); // the bug: the old key alone misses
  });

  it("moves an old single-name block into the new scope and keeps its contents", () => {
    const input = JSON.stringify({
      "workbench.colorCustomizations": {
        "[Default Dark Modern]": { "editor.background": "#111111", "my.color": "#abcdef" },
      },
    });
    const r = run(input);
    const parsed = parseJsonc(r.text) as Record<string, Record<string, Record<string, string>>>;
    const keys = Object.keys(parsed["workbench.colorCustomizations"]);
    expect(keys).toEqual(["[Default Dark Modern][Dark Modern]"]);
    const block = parsed["workbench.colorCustomizations"][keys[0]];
    expect(block["my.color"]).toBe("#abcdef");
    expect(block["editor.background"]).not.toBe("#111111"); // ours wins, as before
    expect(r.notes.join(" ")).toMatch(/Moved your/);
  });
});
