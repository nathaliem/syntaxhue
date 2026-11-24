import { describe, expect, it } from "vitest";
import { SCOPES } from "../derive";
import { generate } from "../theme";
import { portInput } from "./port";
import { sublime } from "./sublime";

const make = (theme = generate(7, "dark")) => {
  const [f] = sublime.files(portInput(theme));
  return { path: f.path, json: JSON.parse(f.content) };
};
const HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/;

describe("Sublime Text color scheme", () => {
  it("is a .sublime-color-scheme named after the theme", () => {
    const { path, json } = make({ ...generate(7, "dark"), name: "Velvet Meadow" });
    expect(path).toBe("velvet-meadow.sublime-color-scheme");
    expect(json.name).toBe("Velvet Meadow");
  });

  it("defines every variable as a valid color and every var() reference resolves", () => {
    const { json } = make();
    for (const [k, v] of Object.entries(json.variables)) expect(v, k).toMatch(HEX);
    const used = JSON.stringify([json.globals, json.rules])
      .match(/var\(([\w-]+)\)/g)!
      .map((m) => m.slice(4, -1));
    expect(used.length).toBeGreaterThan(20);
    for (const name of used) expect(json.variables[name], name).toBeDefined();
    for (const [k, v] of Object.entries(json.globals)) {
      if (typeof v === "string" && v.startsWith("#")) expect(v, k).toMatch(HEX);
    }
  });

  it("has the globals Sublime needs for an editor", () => {
    const g = make().json.globals;
    for (const k of ["background", "foreground", "caret", "line_highlight", "selection", "gutter_foreground"]) {
      expect(g[k], k).toBeDefined();
    }
  });

  it("reuses the shared scope table, role for role", () => {
    const { json } = make();
    const rules: { scope: string; foreground: string }[] = json.rules;
    for (const { role, scope } of SCOPES) {
      const rule = rules.find((r) => r.scope === scope.join(", "));
      expect(rule, scope.join()).toBeDefined();
      expect(rule!.foreground).toBe(`var(${role})`);
    }
  });

  it("covers errors, warnings, additions and diff headers", () => {
    const scopes = make()
      .json.rules.map((r: { scope: string }) => r.scope)
      .join(" ");
    for (const s of ["invalid", "markup.deleted", "markup.inserted", "markup.changed", "meta.diff.header"]) {
      expect(scopes).toContain(s);
    }
  });

  it("writes italic for keyword and comment by default, nothing for plain roles", () => {
    const rules: { name: string; font_style?: string }[] = make().json.rules;
    expect(rules.find((r) => r.name === "Keyword")!.font_style).toBe("italic");
    expect(rules.find((r) => r.name === "String")!.font_style).toBeUndefined();
  });
});
