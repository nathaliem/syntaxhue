import { describe, expect, it } from "vitest";
import { ansiPalette } from "../ansi";
import { hexToRgb, type Hex } from "../color";
import { generate } from "../theme";
import { portInput } from "./port";
import { alacritty, ghostty, iterm2, kitty, warp, windowsTerminal, wezterm } from "./terminals";

const theme = { ...generate(7, "dark"), name: 'Velvet "Meadow" & <Co>' };
const input = portInput(theme);
const p = ansiPalette(input);
const all16 = [...p.normal, ...p.bright];
const content = (t: typeof kitty) => t.files(input)[0].content;
const path = (t: typeof kitty) => t.files(input)[0].path;

describe("terminal formats read back to the same palette", () => {
  it("Windows Terminal: valid JSON with the 16 named colors", () => {
    const s = JSON.parse(content(windowsTerminal));
    expect(s.name).toBe(theme.name);
    const names = ["black", "red", "green", "yellow", "blue", "purple", "cyan", "white"];
    expect(names.map((n) => s[n])).toEqual(p.normal);
    expect(names.map((n) => s["bright" + n[0].toUpperCase() + n.slice(1)])).toEqual(p.bright);
    expect([s.background, s.foreground, s.cursorColor, s.selectionBackground]).toEqual([
      p.background,
      p.foreground,
      p.cursor,
      p.selection,
    ]);
  });

  it("iTerm2: well-formed plist whose components match each color", () => {
    const doc = new DOMParser().parseFromString(content(iterm2), "application/xml");
    expect(doc.querySelector("parsererror")).toBeNull();
    const dict = doc.querySelector("plist > dict")!;
    const keys = [...dict.children].filter((e) => e.tagName === "key").map((e) => e.textContent);
    expect(keys.filter((k) => /^Ansi \d+ Color$/.test(k!))).toHaveLength(16);
    const colorOf = (key: string): Hex => {
      const k = [...dict.children].find((e) => e.tagName === "key" && e.textContent === key)!;
      const d = k.nextElementSibling!;
      const n = (name: string) => {
        const kk = [...d.children].find((e) => e.textContent === name)!;
        return Math.round(Number(kk.nextElementSibling!.textContent) * 255);
      };
      return ("#" +
        [n("Red Component"), n("Green Component"), n("Blue Component")]
          .map((v) => v.toString(16).padStart(2, "0"))
          .join("")) as Hex;
    };
    all16.forEach((c, k) => expect(colorOf(`Ansi ${k} Color`)).toBe(c));
    expect(colorOf("Background Color")).toBe(p.background);
    expect(colorOf("Cursor Color")).toBe(p.cursor);
    expect(hexToRgb(colorOf("Foreground Color"))).toEqual(hexToRgb(p.foreground));
  });

  it("Ghostty: palette lines 0 to 15 and the main colors", () => {
    const text = content(ghostty);
    all16.forEach((c, k) => expect(text).toContain(`palette = ${k}=${c}\n`));
    expect(text).toContain(`background = ${p.background}\n`);
    expect(text).toContain(`cursor-color = ${p.cursor}\n`);
    expect(path(ghostty)).not.toContain(".");
  });

  it("Alacritty: both color tables in order, strings quoted", () => {
    const text = content(alacritty);
    const table = (name: string) =>
      [
        ...text
          .split(`[colors.${name}]\n`)[1]
          .split("\n\n")[0]
          .matchAll(/= "(#[0-9a-f]{6})"/g),
      ].map((m) => m[1]);
    expect(table("normal")).toEqual(p.normal);
    expect(table("bright")).toEqual(p.bright);
    expect(text).toContain(`cursor = "${p.cursor}"`);
    expect(text.split("\n")[0]).not.toContain("\n");
  });

  it("Kitty: color0 to color15", () => {
    const text = content(kitty);
    all16.forEach((c, k) => expect(text).toMatch(new RegExp(`^color${k} ${c}$`, "m")));
    expect(text).toMatch(new RegExp(`^background ${p.background}$`, "m"));
  });

  it("WezTerm: ansi and brights arrays and a metadata name that survives quotes", () => {
    const text = content(wezterm);
    const arr = (key: string) => JSON.parse(text.match(new RegExp(`^${key} = (\\[.*\\])$`, "m"))![1]);
    expect(arr("ansi")).toEqual(p.normal);
    expect(arr("brights")).toEqual(p.bright);
    expect(JSON.parse(text.match(/^name = (.*)$/m)![1])).toBe(theme.name);
  });

  it("Warp: yaml keys, single-quoted colors, the 16 ansi colors and darker/lighter details", () => {
    const text = content(warp);
    const names = ["black", "red", "green", "yellow", "blue", "purple", "cyan", "white"];
    const group = (name: string) => {
      const block = text.split(`  ${name}:\n`)[1].split("\n").slice(0, 8);
      return names.map((n) => block.find((l) => l.startsWith(`    ${n}: `))!.split("'")[1]);
    };
    expect(group("normal")).toEqual(p.normal);
    expect(group("bright")).toEqual(p.bright);
    expect(text).toMatch(new RegExp(`^background: '${p.background}'$`, "m"));
    expect(text).toMatch(new RegExp(`^foreground: '${p.foreground}'$`, "m"));
    expect(text).toMatch(/^details: darker$/m);
    expect(JSON.parse(text.match(/^name: (.*)$/m)![1])).toBe(theme.name);
    const light = warp.files(portInput({ ...generate(7, "light"), name: "L" }))[0].content;
    expect(light).toMatch(/^details: lighter$/m);
  });

  it("names every file after the theme, in a form safe for any file system", () => {
    for (const t of [windowsTerminal, iterm2, ghostty, alacritty, kitty, wezterm, warp]) {
      expect(path(t)).toMatch(/^velvet-meadow-co(\.[a-z]+)?$/);
    }
  });
});
