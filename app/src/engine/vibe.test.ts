import { describe, expect, it } from "vitest";
import { contrast, hexToOklch } from "./color";
import { semanticRules, settingsSnippetText, surfaces, themeFile, tokenRules, workbenchColors } from "./derive";
import { generate, ROLES, ROLE_IDS, VIBE_KEYS, ZERO_VIBE, type ThemeState, type Vibe } from "./theme";
import { effectiveTheme } from "./vibe";
import { reducer, type History } from "../state";

const withVibe = (t: ThemeState, vibe: Partial<Vibe>): ThemeState => ({ ...t, vibe: { ...ZERO_VIBE, ...vibe } });
const colors = (t: ThemeState) => ROLE_IDS.map((id) => t.roles[id].color);

describe("vibe: non-destructive", () => {
  it("does not touch the stored roles", () => {
    const t = withVibe(generate(1, "dark"), { contrast: 1, saturation: 1, warmth: 1, depth: 1 });
    const before = JSON.stringify(t.roles);
    effectiveTheme(t);
    workbenchColors(t);
    expect(JSON.stringify(t.roles)).toBe(before);
  });

  it("at 0 returns exactly the original colors (same object)", () => {
    const t = generate(2, "light");
    expect(effectiveTheme(t)).toBe(t);
    expect(effectiveTheme(withVibe(t, { depth: 0.7 })).roles).toBe(t.roles); // depth never recolors roles
  });

  it("each slider returns to the original when put back to 0", () => {
    for (const key of ["contrast", "saturation", "warmth"] as const) {
      const t = generate(3, "dark");
      let h: History = { past: [], present: t, future: [] };
      h = reducer(h, { type: "vibe", key, value: 0.8 });
      expect(colors(effectiveTheme(h.present))).not.toEqual(colors(t));
      h = reducer(h, { type: "vibe", key, value: 0 });
      expect(colors(effectiveTheme(h.present))).toEqual(colors(t));
    }
  });

  it("is applied once, even if an effective theme is passed in again", () => {
    const t = withVibe(generate(4, "dark"), { saturation: 0.7, warmth: 0.5 });
    const e = effectiveTheme(t);
    expect(effectiveTheme(e)).toBe(e);
    expect(workbenchColors(e)).toEqual(workbenchColors(t));
  });
});

describe("vibe: the sliders do what they say", () => {
  const chroma = (t: ThemeState, id: (typeof ROLE_IDS)[number]) => hexToOklch(t.roles[id].color).c;

  it("saturation scales chroma (some colors are already at the sRGB edge, so compare the total)", () => {
    const t = generate(5, "dark");
    const total = (e: ThemeState) => ROLE_IDS.reduce((n, id) => n + chroma(e, id), 0);
    const vivid = effectiveTheme(withVibe(t, { saturation: 1 }));
    const muted = effectiveTheme(withVibe(t, { saturation: -1 }));
    expect(total(vivid)).toBeGreaterThan(total(t));
    expect(total(muted)).toBeLessThan(total(t) * 0.6);
    expect(chroma(muted, "accent")).toBeLessThan(chroma(t, "accent") * 0.6);
  });

  it("contrast: crisp text is further from the background than soft text", () => {
    const t = generate(6, "dark");
    const crisp = effectiveTheme(withVibe(t, { contrast: 1 }));
    const soft = effectiveTheme(withVibe(t, { contrast: -1 }));
    const total = (e: ThemeState) =>
      ROLES.filter((r) => r.min > 0).reduce((n, r) => n + contrast(e.roles[r.id].color, e.roles.bg.color), 0);
    expect(total(crisp)).toBeGreaterThan(total(soft));
    expect(crisp.roles.bg.color).toBe(t.roles.bg.color); // the background itself stays put
  });

  it("warmth moves hues toward orange (warm) or blue (cool)", () => {
    const t = generate(7, "dark");
    const dist = (h: number, target: number) => Math.abs(((h - target + 540) % 360) - 180);
    const warm = effectiveTheme(withVibe(t, { warmth: 1 }));
    const cool = effectiveTheme(withVibe(t, { warmth: -1 }));
    for (const id of ["keyword", "string", "function", "type"] as const) {
      expect(dist(hexToOklch(warm.roles[id].color).h, 55)).toBeLessThanOrEqual(
        dist(hexToOklch(t.roles[id].color).h, 55) + 2,
      );
      expect(dist(hexToOklch(cool.roles[id].color).h, 250)).toBeLessThanOrEqual(
        dist(hexToOklch(t.roles[id].color).h, 250) + 2,
      );
    }
  });

  it("depth scales the surface ladder: flat has no steps, layered has bigger ones", () => {
    const t = generate(8, "dark");
    const step = (v: number) => {
      const s = surfaces(withVibe(t, { depth: v }));
      return Math.abs(hexToOklch(s.sidebar).l - hexToOklch(s.editor).l);
    };
    expect(step(-1)).toBeLessThan(0.002);
    expect(step(0)).toBeCloseTo(0.03, 1);
    expect(step(1)).toBeGreaterThan(step(0));
  });
});

describe("vibe: depth never changes syntax colors", () => {
  it("token and semantic rules are identical at any depth", () => {
    const t = generate(9, "light");
    const base = { tokens: tokenRules(t), semantic: semanticRules(t) };
    for (const depth of [-1, -0.5, 0.5, 1]) {
      const v = withVibe(t, { depth });
      expect(tokenRules(v)).toEqual(base.tokens);
      expect(semanticRules(v)).toEqual(base.semantic);
    }
  });

  it("changes derived surfaces in the exported workbench colors", () => {
    const t = generate(9, "dark");
    expect(workbenchColors(withVibe(t, { depth: 1 }))["sideBar.background"]).not.toBe(
      workbenchColors(t)["sideBar.background"],
    );
  });
});

describe("vibe: contrast minimums always hold", () => {
  const positions = [-1, -0.5, 0, 0.5, 1];

  it("every role stays at or above its minimum across seeds, modes and slider positions", () => {
    const failures: string[] = [];
    for (let seed = 1; seed <= 40; seed++) {
      for (const mode of ["dark", "light"] as const) {
        const t = generate(seed, mode);
        const check = (vibe: Partial<Vibe>) => {
          const e = effectiveTheme(withVibe(t, vibe));
          for (const def of ROLES) {
            if (def.min && contrast(e.roles[def.id].color, e.roles.bg.color) < def.min - 1e-9) {
              failures.push(`seed ${seed} ${mode} ${def.id} ${JSON.stringify(vibe)}`);
            }
          }
        };
        for (const key of VIBE_KEYS) for (const v of positions) check({ [key]: v });
        for (const c of [-1, 1])
          for (const s of [-1, 1]) for (const w of [-1, 1]) check({ contrast: c, saturation: s, warmth: w });
      }
    }
    expect(failures.slice(0, 5)).toEqual([]);
  });

  it("leaves a color the user set below its minimum alone, and never makes it worse", () => {
    const t = generate(3, "dark");
    const minimum = ROLES.find((r) => r.id === "string")!.min;
    const bad = { ...t, roles: { ...t.roles, string: { ...t.roles.string, color: t.roles.bg.color } } };
    const before = contrast(bad.roles.string.color, bad.roles.bg.color);
    expect(before).toBeLessThan(minimum);
    for (const vibe of [{ saturation: 1 }, { warmth: -1 }, { contrast: 1 }, { contrast: -1, saturation: 1 }]) {
      const e = effectiveTheme(withVibe(bad, vibe));
      const after = contrast(e.roles.string.color, e.roles.bg.color);
      expect(after).toBeLessThan(minimum);
      expect(after).toBeGreaterThanOrEqual(before - 1e-9);
    }
  });

  it("never recolors a locked role, whatever the sliders say", () => {
    const t = generate(3, "dark");
    const pick = "#ff00aa" as const;
    const locked = { ...t, roles: { ...t.roles, accent: { ...t.roles.accent, color: pick, locked: true } } };
    for (const vibe of [{ saturation: 1 }, { warmth: 1 }, { warmth: -1 }, { contrast: 1 }, { contrast: -1 }]) {
      const e = effectiveTheme(withVibe(locked, vibe));
      expect(e.roles.accent.color).toBe(pick);
      expect(e.roles.keyword.color).not.toBe(t.roles.keyword.color); // unlocked roles still follow vibe
    }
  });

  it("keeps a color the user set by hand exactly as picked, whatever the sliders say", () => {
    const t = generate(3, "dark");
    const pick = "#ff00aa" as const;
    const edited = { ...t, roles: { ...t.roles, accent: { ...t.roles.accent, color: pick, picked: true } } };
    for (const vibe of [{ saturation: 1 }, { warmth: 1 }, { warmth: -1 }, { contrast: 1 }, { contrast: -1 }]) {
      expect(effectiveTheme(withVibe(edited, vibe)).roles.accent.color).toBe(pick);
    }
  });

  it("pushes lightness back when a slider would break a minimum", () => {
    const t = generate(10, "dark");
    const soft = effectiveTheme(withVibe(t, { contrast: -1 }));
    expect(contrast(soft.roles.fg.color, soft.roles.bg.color)).toBeGreaterThanOrEqual(7);
  });

  it("exports carry the effective colors", () => {
    const t = withVibe(generate(11, "dark"), { saturation: 1, warmth: 1, contrast: 0.5 });
    const e = effectiveTheme(t);
    expect(workbenchColors(t).foreground).toBe(e.roles.fg.color);
    expect(settingsSnippetText(t)).toContain(e.roles.keyword.color);
    expect(JSON.stringify(themeFile(t))).toContain(e.roles.keyword.color);
    expect(settingsSnippetText(t)).not.toBe(settingsSnippetText(withVibe(t, {})));
  });
});

describe("vibe in the reducer", () => {
  const start = (): History => ({ past: [], present: generate(12, "dark"), future: [] });

  it("a slider drag is one undo step", () => {
    let h = start();
    for (const v of [0.1, 0.3, 0.5, 0.7]) h = reducer(h, { type: "vibe", key: "warmth", value: v, commit: false });
    h = reducer(h, { type: "vibe", key: "warmth", value: 0.7, commit: true });
    expect(h.present.vibe.warmth).toBe(0.7);
    expect(h.past).toHaveLength(1);
    h = reducer(h, { type: "undo" });
    expect(h.present.vibe.warmth).toBe(0);
  });

  it("clamps and rounds to the slider step", () => {
    let h = reducer(start(), { type: "vibe", key: "depth", value: 5 });
    expect(h.present.vibe.depth).toBe(1);
    h = reducer(h, { type: "vibe", key: "depth", value: 0.3333 });
    expect(h.present.vibe.depth).toBe(0.33);
  });

  it("resets one slider or all, and an unchanged reset adds no undo step", () => {
    let h = reducer(start(), { type: "vibe", key: "contrast", value: 0.4 });
    h = reducer(h, { type: "vibe", key: "depth", value: -0.4 });
    h = reducer(h, { type: "vibeReset", key: "contrast" });
    expect(h.present.vibe).toEqual({ ...ZERO_VIBE, depth: -0.4 });
    h = reducer(h, { type: "vibeReset" });
    expect(h.present.vibe).toEqual(ZERO_VIBE);
    expect(reducer(h, { type: "vibeReset" })).toBe(h);
    expect(reducer(h, { type: "vibe", key: "depth", value: 0 })).toBe(h);
  });

  it("shuffle and mode switch keep the vibe", () => {
    let h = reducer(start(), { type: "vibe", key: "saturation", value: -0.6 });
    h = reducer(h, { type: "shuffle", seed: 4 });
    expect(h.present.vibe.saturation).toBe(-0.6);
    h = reducer(h, { type: "mode", mode: "light", seed: 5 });
    expect(h.present.vibe.saturation).toBe(-0.6);
  });
});
