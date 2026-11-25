import { describe, expect, it } from "vitest";
import { ANSI_MIN_BRIGHT_STEP, ANSI_MIN_DIM, ANSI_MIN_HUE, ansiContrast, ansiPalette } from "./ansi";
import { colorDistance, contrast, isHex } from "./color";
import { generate } from "./theme";
import { portInput } from "./ports";

const seeds = Array.from({ length: 60 }, (_, i) => i + 1);
const palettes = seeds.flatMap((s) =>
  (["dark", "light"] as const).map((m) => ({ s, m, p: ansiPalette(portInput(generate(s, m))) })),
);

describe("ANSI palette", () => {
  it("has 16 valid colors in two rows of 8", () => {
    for (const { p } of palettes) {
      expect(p.normal).toHaveLength(8);
      expect(p.bright).toHaveLength(8);
      for (const c of [...p.normal, ...p.bright, p.background, p.foreground, p.cursor, p.selection]) {
        expect(isHex(c)).toBe(true);
      }
    }
  });

  it("keeps the hues, bright hues and bright black readable on the background", () => {
    for (const { s, m, p } of palettes) {
      const c = ansiContrast(p);
      const at = `seed ${s} ${m}`;
      expect(Math.min(...c.hues), at).toBeGreaterThanOrEqual(ANSI_MIN_HUE);
      expect(c.brightBlack, at).toBeGreaterThanOrEqual(ANSI_MIN_DIM);
      expect(c.foreground, at).toBeGreaterThanOrEqual(7);
    }
  });

  it("exports the six hues exactly as the roles are, never adjusted", () => {
    for (const { s, m } of palettes) {
      const input = portInput(generate(s, m));
      const r = input.roles;
      expect(ansiPalette(input).normal.slice(1, 7), `seed ${s} ${m}`).toEqual([
        r.error,
        r.success,
        r.warning,
        r.info,
        r.keyword,
        r.function,
      ]);
      expect(ansiPalette(input).bright[0]).toBe(r.muted);
    }
  });

  it("leaves colors the user set below the minimum alone, and brights never read worse than their normal color", () => {
    const t = generate(4, "dark");
    const bg = t.roles.bg.color;
    const bad = {
      ...t,
      roles: { ...t.roles, error: { ...t.roles.error, color: bg }, muted: { ...t.roles.muted, color: bg } },
    };
    const p = ansiPalette(portInput(bad));
    expect(p.normal[1]).toBe(bg);
    expect(p.bright[0]).toBe(bg);
    expect(contrast(p.bright[1], p.background)).toBeGreaterThanOrEqual(contrast(p.normal[1], p.background) - 1e-9);
  });

  it("makes each bright hue visibly different from its normal one", () => {
    for (const { s, m, p } of palettes) {
      for (let i = 1; i < 7; i++) {
        expect(colorDistance(p.normal[i], p.bright[i]), `seed ${s} ${m}: ${i}`).toBeGreaterThanOrEqual(
          ANSI_MIN_BRIGHT_STEP,
        );
      }
    }
  });

  it("is deterministic and puts text and surface at the ends", () => {
    const t = generate(7, "dark");
    expect(ansiPalette(portInput(t))).toEqual(ansiPalette(portInput(t)));
    const p = ansiPalette(portInput(t));
    expect(p.bright[7]).toBe(p.foreground);
    const l = ansiPalette(portInput(generate(7, "light")));
    expect(l.normal[0]).toBe(l.foreground);
    expect(l.bright[7]).toBe(l.background);
  });
});
