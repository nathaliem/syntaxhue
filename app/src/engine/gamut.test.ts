import { describe, expect, it } from "vitest";
import { hexToOklch, oklchToHex, oklchToHexInGamut } from "./color";

const hueDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

describe("gamut mapping", () => {
  it("leaves colors that are already inside sRGB untouched", () => {
    for (const hex of ["#336699", "#ff0000", "#00ff00", "#ffffff", "#000000", "#808080", "#e5c07b"]) {
      expect(oklchToHex(hexToOklch(hex))).toBe(hex);
    }
  });

  it("lowers chroma instead of shifting hue for out-of-gamut colors", () => {
    // Saturated blue and yellow at chroma far beyond sRGB; clipping channels would pull these toward other hues.
    for (const [l, c, h] of [
      [0.5, 0.4, 265],
      [0.9, 0.35, 100],
      [0.7, 0.4, 145],
      [0.6, 0.4, 25],
    ]) {
      const hex = oklchToHex({ l, c, h });
      const back = hexToOklch(hex);
      expect(back.c).toBeLessThan(c);
      expect(back.c).toBeGreaterThan(0.05);
      expect(hueDiff(back.h, h)).toBeLessThan(4);
      expect(Math.abs(back.l - l)).toBeLessThan(0.02);
    }
  });

  it("always returns a valid hex, across a sweep of lightness, chroma and hue", () => {
    for (let l = 0; l <= 1; l += 0.1) {
      for (let c = 0; c <= 0.5; c += 0.1) {
        for (let h = 0; h < 360; h += 30) {
          expect(oklchToHex({ l, c, h })).toMatch(/^#[0-9a-f]{6}$/);
        }
      }
    }
  });

  it("gives gray when lightness itself is out of range", () => {
    expect(oklchToHex({ l: 1.2, c: 0.3, h: 200 })).toBe("#ffffff");
    expect(oklchToHex({ l: -0.1, c: 0.3, h: 200 })).toBe("#000000");
  });

  it("keeps the old in-gamut name working", () => {
    expect(oklchToHexInGamut({ l: 0.6, c: 0.5, h: 30 })).toBe(oklchToHex({ l: 0.6, c: 0.5, h: 30 }));
  });
});
