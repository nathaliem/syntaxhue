import { describe, expect, it } from "vitest";
import { contrast, fixContrast, hexToOklch, oklchToHex } from "./color";
import { contrastIssues, generate, ROLE_IDS, ROLES } from "./theme";
import { settingsSnippet, settingsSnippetText, themeFile, workbenchColors } from "./derive";
import { decodeTheme, encodeTheme } from "./share";

describe("color", () => {
  it("computes WCAG contrast", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#777777", "#777777")).toBeCloseTo(1, 5);
  });

  it("round-trips hex through OKLCH", () => {
    for (const hex of ["#1b1f2a", "#c792ea", "#a5d98f", "#ff0000", "#ffffff", "#000000", "#2f4bff"]) {
      expect(oklchToHex(hexToOklch(hex))).toBe(hex);
    }
  });

  it("fixContrast only changes lightness and reaches the target", () => {
    const bg = "#1b1f2a";
    const fixed = fixContrast("#3a3f6a", bg, 4.5);
    expect(contrast(fixed, bg)).toBeGreaterThanOrEqual(4.5);
    expect(Math.abs(hexToOklch(fixed).h - hexToOklch("#3a3f6a").h)).toBeLessThan(6);
  });
});

describe("generate", () => {
  it.each(["dark", "light"] as const)("every %s theme meets contrast minimums (300 seeds)", (mode) => {
    for (let seed = 1; seed <= 300; seed++) {
      const t = generate(seed, mode);
      expect(contrastIssues(t), `seed ${seed}`).toEqual([]);
    }
  });

  it("is deterministic per seed", () => {
    expect(generate(42, "dark")).toEqual(generate(42, "dark"));
  });

  it("keeps locked roles when shuffling", () => {
    const a = generate(1, "dark");
    a.roles.keyword.locked = true;
    a.roles.bg.locked = true;
    const b = generate(2, "dark", a);
    expect(b.roles.keyword.color).toBe(a.roles.keyword.color);
    expect(b.roles.bg.color).toBe(a.roles.bg.color);
    expect(b.roles.string.color).not.toBe(a.roles.string.color);
  });

  it("dark themes have dark backgrounds, light themes light ones", () => {
    expect(hexToOklch(generate(7, "dark").roles.bg.color).l).toBeLessThan(0.3);
    expect(hexToOklch(generate(7, "light").roles.bg.color).l).toBeGreaterThan(0.9);
  });
});

describe("export", () => {
  const t = generate(3, "dark");

  it("scopes settings to the base theme", () => {
    const s = settingsSnippet(t) as unknown as Record<string, Record<string, unknown>>;
    expect(s["workbench.colorTheme"]).toBe("Default Dark Modern");
    expect(Object.keys(s["workbench.colorCustomizations"])).toEqual(["[Default Dark Modern]"]);
    expect(s["editor.tokenColorCustomizations"]["[Default Dark Modern]"]).toHaveProperty("textMateRules");
  });

  it("snippet text is valid JSON when wrapped in braces", () => {
    const text = settingsSnippetText(t).replace(/^\/\/.*\n/, "").replace(/,\s*$/, "");
    expect(() => JSON.parse(`{${text}}`)).not.toThrow();
  });

  it("all workbench values are 6 or 8 digit hex", () => {
    for (const v of Object.values(workbenchColors(t))) expect(v).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/);
  });

  it("theme file has required fields", () => {
    const f = themeFile(t);
    expect(f.type).toBe("dark");
    expect(f.tokenColors.length).toBeGreaterThan(5);
  });
});

describe("share", () => {
  it("round-trips through the URL encoding", () => {
    const t = generate(9, "light");
    t.roles.string.fontStyle = ["bold", "italic"];
    const back = decodeTheme(encodeTheme(t))!;
    expect(back.name).toBe(t.name);
    expect(back.mode).toBe("light");
    for (const id of ROLE_IDS) expect(back.roles[id].color).toBe(t.roles[id].color);
    expect(back.roles.string.fontStyle.sort()).toEqual(["bold", "italic"]);
  });

  it("rejects garbage", () => {
    expect(decodeTheme("nope")).toBeNull();
    expect(decodeTheme("1.d.x.zz.-")).toBeNull();
  });

  it("has one entry per role", () => {
    expect(ROLES.map((r) => r.id)).toEqual([...ROLE_IDS]);
  });
});
