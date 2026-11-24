import { describe, expect, it } from "vitest";
import { generate } from "../theme";
import { portInput } from "./port";
import { zed } from "./zed";

const parse = (theme = generate(7, "dark")) => JSON.parse(zed.files(portInput(theme))[0].content);
const HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/;

function colors(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => colors(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => colors(v, out));
  return out;
}

describe("Zed theme", () => {
  it("is a theme family with one theme, named and flagged by appearance", () => {
    const f = parse({ ...generate(7, "light"), name: "Pale Fox" });
    expect(f.$schema).toMatch(/zed\.dev\/schema\/themes/);
    expect(f.name).toBe("Pale Fox");
    expect(f.themes).toHaveLength(1);
    expect(f.themes[0]).toMatchObject({ name: "Pale Fox", appearance: "light" });
    expect(parse().themes[0].appearance).toBe("dark");
  });

  it("writes only valid colors, and none is left undefined", () => {
    const style = parse().themes[0].style;
    const found = colors(style).filter((c) => !["italic", "oblique", "normal"].includes(c));
    expect(found.length).toBeGreaterThan(100);
    for (const c of found) expect(c, c).toMatch(HEX);
  });

  it("covers the editor, UI, status, terminal and syntax keys Zed themes are made of", () => {
    const s = parse().themes[0].style;
    for (const k of [
      "background",
      "editor.background",
      "editor.foreground",
      "text",
      "text.muted",
      "border",
      "panel.background",
      "tab.active_background",
      "terminal.ansi.red",
      "terminal.ansi.bright_cyan",
      "error",
      "warning.background",
      "success.border",
    ]) {
      expect(s[k], k).toBeDefined();
    }
    for (const k of [
      "comment",
      "keyword",
      "string",
      "function",
      "type",
      "variable",
      "constant",
      "number",
      "operator",
    ]) {
      expect(s.syntax[k].color, k).toMatch(HEX);
    }
    expect(s.players[0].cursor).toMatch(HEX);
  });

  it("takes syntax colors from the same roles as the VS Code theme", () => {
    const t = generate(7, "dark");
    const i = portInput(t);
    const s = parse(t).themes[0].style.syntax;
    expect(s.keyword.color).toBe(i.roles.keyword);
    expect(s.string.color).toBe(i.roles.string);
    expect(s.function.color).toBe(i.roles.function);
    expect(s.comment.color).toBe(i.roles.muted);
  });

  it("carries italic and bold from the role styles", () => {
    const t = generate(7, "dark");
    const styled = {
      ...t,
      roles: { ...t.roles, string: { ...t.roles.string, fontStyle: ["italic", "bold"] as ("italic" | "bold")[] } },
    };
    const s = parse(styled).themes[0].style.syntax;
    expect(s.string).toMatchObject({ font_style: "italic", font_weight: 700 });
    expect(s["string.regex"]).toMatchObject({ font_style: "italic" });
    expect(parse(t).themes[0].style.syntax.keyword.font_style).toBe("italic"); // keyword is italic by default
    expect(parse(t).themes[0].style.syntax.number.font_style).toBeUndefined();
  });
});
