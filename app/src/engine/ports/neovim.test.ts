import { describe, expect, it } from "vitest";
import { ansiPalette } from "../ansi";
import { generate } from "../theme";
import { portInput } from "./port";
import { neovim } from "./neovim";

const theme = { ...generate(7, "dark"), name: "Velvet Meadow" };
const input = portInput(theme);
const src = (t = theme) => neovim.files(portInput(t))[0].content;

function table(text: string): Record<string, string> {
  const body = text.split("local c = {\n")[1].split("\n}")[0];
  return Object.fromEntries([...body.matchAll(/^\s+(\w+) = "(#[0-9a-f]{6})",$/gm)].map((m) => [m[1], m[2]]));
}

describe("Neovim colorscheme", () => {
  it("is a Lua file in the colors folder named after the theme, and sets the basics", () => {
    const [f] = neovim.files(input);
    expect(f.path).toBe("colors/velvet-meadow.lua");
    expect(f.content).toContain('vim.g.colors_name = "velvet-meadow"');
    expect(f.content).toContain('vim.o.background = "dark"');
    expect(src({ ...generate(7, "light"), name: "X" })).toContain('vim.o.background = "light"');
    expect(f.content).toContain("vim.o.termguicolors = true");
  });

  it("defines each named color once as a valid hex, and every c.<name> used exists", () => {
    const text = src();
    const colors = table(text);
    expect(Object.keys(colors).length).toBeGreaterThan(25);
    const names = [...text.matchAll(/^\s+(\w+) = "#/gm)].map((m) => m[1]);
    expect(new Set(names).size).toBe(names.length);
    const used = [...text.matchAll(/\bc\.(\w+)/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(150);
    for (const u of used) expect(colors[u], u).toBeDefined();
  });

  it("writes only well-formed hl() calls, one per group", () => {
    const lines = src()
      .split("\n")
      .filter((l) => l.startsWith("hl("));
    expect(lines.length).toBeGreaterThan(150);
    const groups: string[] = [];
    for (const l of lines) {
      const m = /^hl\("([@\w.]+)", \{ ((?:\w+ = (?:c\.\w+|true)(?:, )?)+) \}\)$/.exec(l);
      expect(m, l).not.toBeNull();
      groups.push(m![1]);
    }
    expect(new Set(groups).size).toBe(groups.length);
  });

  it("covers the editor, Vim syntax, diagnostics, Tree-sitter and LSP groups", () => {
    const text = src();
    for (const g of [
      "Normal",
      "CursorLine",
      "Visual",
      "Pmenu",
      "Comment",
      "String",
      "Function",
      "DiagnosticError",
      "DiagnosticUnderlineWarn",
      "@keyword",
      "@tag.attribute",
      "@lsp.type.class",
      "@lsp.typemod.variable.readonly",
    ]) {
      expect(text, g).toContain(`hl("${g}",`);
    }
  });

  it("sets the 16 terminal colors from the ANSI palette", () => {
    const p = ansiPalette(input);
    const text = src();
    [...p.normal, ...p.bright].forEach((c, k) => expect(text).toContain(`vim.g.terminal_color_${k} = "${c}"`));
  });

  it("applies the role font styles (keyword italic by default, plain strings)", () => {
    const text = src();
    expect(text).toMatch(/hl\("Keyword", \{ fg = c\.keyword, italic = true \}\)/);
    expect(text).toMatch(/hl\("String", \{ fg = c\.string \}\)/);
    expect(text).toMatch(/hl\("@markup.strong", \{ bold = true \}\)/);
  });

  it("keeps an unusual theme name from breaking out of the comment", () => {
    const text = src({ ...theme, name: "Evil\nvim.cmd('quit')" });
    expect(text.split("\n")[0]).toBe("-- Evil vim.cmd('quit'), made with SyntaxHue");
    expect(text.split("\n").filter((l) => l.startsWith("vim.cmd('quit')"))).toHaveLength(0);
  });
});
