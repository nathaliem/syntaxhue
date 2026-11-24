import { describe, expect, it } from "vitest";
import { contrast, fixContrast, hexToOklch, oklchToHex } from "./color";
import { contrastIssues, distinctness, generate, ROLE_IDS, ROLES, shuffleLabel, unlockedCount } from "./theme";
import { reducer, type History } from "../state";
import { semanticRules, settingsSnippet, settingsSnippetText, themeFile, tokenRules, workbenchColors } from "./derive";
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
    const text = settingsSnippetText(t)
      .replace(/^\/\/.*\n/, "")
      .replace(/,\s*$/, "");
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

describe("underline", () => {
  it("is exported as a TextMate fontStyle and a semantic flag", () => {
    const t = generate(3, "dark");
    t.roles.type.fontStyle = ["bold", "underline"];
    const rule = tokenRules(t).find((r) => r.scope.includes("entity.name.class"))!;
    expect(rule.settings.fontStyle).toBe("bold underline");
    expect(semanticRules(t).class).toMatchObject({ bold: true, underline: true });
    expect(semanticRules(t).class).not.toHaveProperty("italic");
  });

  it("survives a share link with the other styles", () => {
    const t = generate(4, "dark");
    t.roles.string.fontStyle = ["italic", "underline"];
    t.roles.type.fontStyle = ["bold", "italic", "underline"];
    const back = decodeTheme(encodeTheme(t))!;
    expect([...back.roles.string.fontStyle].sort()).toEqual(["italic", "underline"]);
    expect([...back.roles.type.fontStyle].sort()).toEqual(["bold", "italic", "underline"]);
    expect(back.roles.keyword.fontStyle).toEqual(t.roles.keyword.fontStyle);
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

describe("distinct syntax colors", () => {
  it.each(["dark", "light"] as const)(
    "%s: syntax colors are distinct from each other and from error (500 seeds)",
    (mode) => {
      const failing: number[] = [];
      const t0 = performance.now();
      for (let seed = 1; seed <= 500; seed++) if (distinctness(generate(seed, mode)) < 1) failing.push(seed);
      const ms = (performance.now() - t0) / 500;
      expect(failing, `seeds below threshold`).toEqual([]);
      expect(ms, "average ms per shuffle").toBeLessThan(15);
    },
  );

  it("still meets contrast after retries", () => {
    for (let seed = 1; seed <= 200; seed++) expect(contrastIssues(generate(seed, "light"))).toEqual([]);
  });
});

describe("mode switch", () => {
  it("keeps locked roles locked, with their hue, and readable", () => {
    const dark = generate(11, "dark");
    dark.roles.keyword.locked = true;
    dark.roles.bg.locked = true;
    const light = generate(12, "light", dark);
    expect(light.roles.keyword.locked).toBe(true);
    expect(light.roles.bg.locked).toBe(true);
    expect(light.roles.string.locked).toBe(false);
    expect(hexToOklch(light.roles.bg.color).l).toBeGreaterThan(0.9);
    const hueDiff = Math.abs(hexToOklch(light.roles.keyword.color).h - hexToOklch(dark.roles.keyword.color).h);
    expect(Math.min(hueDiff, 360 - hueDiff)).toBeLessThan(8);
    expect(contrastIssues(light)).toEqual([]);
  });
});

describe("share names", () => {
  it("round-trips names with dots, percent signs and unicode", () => {
    for (const name of ["Night v1.2", "a.b.c", "100% Ember", "Café · Nacht"]) {
      const t = { ...generate(4, "dark"), name };
      expect(decodeTheme(encodeTheme(t))?.name).toBe(name);
    }
  });

  it("still opens old links whose name contained an unescaped dot", () => {
    const t = { ...generate(4, "dark"), name: "Night v1.2" };
    const legacy = encodeTheme(t).replace("%2E", ".");
    expect(decodeTheme(legacy)?.roles.bg.color).toBe(t.roles.bg.color);
  });
});

describe("history", () => {
  const start = (): History => ({ past: [], present: generate(1, "dark"), future: [] });

  it("typing a hex value is one undo step", () => {
    let h = start();
    const original = h.present.roles.keyword.color;
    h = reducer(h, { type: "color", role: "keyword", color: "#aabbcc", commit: false });
    h = reducer(h, { type: "color", role: "keyword", color: "#abcdef", commit: false });
    h = reducer(h, { type: "color", role: "keyword", color: "#abcdef", commit: true });
    expect(h.past).toHaveLength(1);
    h = reducer(h, { type: "undo" });
    expect(h.present.roles.keyword.color).toBe(original);
  });

  it("a commit that changes nothing adds no undo step", () => {
    const h = reducer(start(), {
      type: "color",
      role: "keyword",
      color: start().present.roles.keyword.color,
      commit: true,
    });
    expect(h.past).toHaveLength(0);
  });

  it("switching mode keeps locks", () => {
    let h = reducer(start(), { type: "lock", role: "string" });
    h = reducer(h, { type: "mode", mode: "light", seed: 5 });
    expect(h.present.mode).toBe("light");
    expect(h.present.roles.string.locked).toBe(true);
  });

  it("shuffle label counts unlocked colors", () => {
    expect(shuffleLabel(11)).toBe("Shuffle 11 colors");
    expect(shuffleLabel(1)).toBe("Shuffle 1 color");
    expect(shuffleLabel(0)).toBe("All colors locked");
    let h = reducer(start(), { type: "lock", role: "string" });
    expect(unlockedCount(h.present)).toBe(ROLES.length - 1);
    h = reducer(h, { type: "lockAll", locked: true });
    expect(unlockedCount(h.present)).toBe(0);
    h = reducer(h, { type: "lockAll", locked: false });
    expect(unlockedCount(h.present)).toBe(ROLES.length);
  });

  it("shuffle with everything locked changes nothing and adds no undo step", () => {
    const locked = reducer(start(), { type: "lockAll", locked: true });
    const after = reducer(locked, { type: "shuffle", seed: 9 });
    expect(after).toBe(locked);
  });
});
