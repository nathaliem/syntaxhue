import { describe, expect, it } from "vitest";
import { hexToRgb } from "./color";
import { ICON_SIZE, iconPixels, iconPng } from "./icon";
import { decodePng, encodePng } from "./png";
import { generate } from "./theme";
import { effectiveTheme } from "./vibe";

const theme = generate(7, "dark");

describe("png", () => {
  it("round-trips pixels, including sizes that need several stored blocks", () => {
    for (const [w, h] of [
      [1, 1],
      [3, 2],
      [300, 40],
    ]) {
      const px = new Uint8Array(w * h * 4).map((_, i) => (i * 37) & 255);
      const back = decodePng(encodePng(w, h, px));
      expect(back).toMatchObject({ width: w, height: h });
      expect([...back.rgba]).toEqual([...px]);
    }
  });
  it("refuses pixel data of the wrong size and detects corruption", () => {
    expect(() => encodePng(2, 2, new Uint8Array(3))).toThrow();
    const png = encodePng(2, 2, new Uint8Array(16));
    png[png.length - 20] ^= 1;
    expect(() => decodePng(png)).toThrow();
    expect(() => decodePng(new Uint8Array(20))).toThrow(/Not a PNG/);
  });
});

describe("icon", () => {
  it("is a PNG at least 128 px square, as the Marketplace asks", () => {
    expect(ICON_SIZE).toBeGreaterThanOrEqual(128);
    const { width, height } = decodePng(iconPng(theme));
    expect([width, height]).toEqual([ICON_SIZE, ICON_SIZE]);
  });

  it("has transparent corners, the theme background inside, and uses the role colors", () => {
    const px = iconPixels(theme);
    const at = (x: number, y: number) => [...px.subarray((y * ICON_SIZE + x) * 4, (y * ICON_SIZE + x) * 4 + 4)];
    expect(at(0, 0)[3]).toBe(0);
    const t = effectiveTheme(theme);
    expect(at(10, 64)).toEqual([...hexToRgb(t.roles.bg.color), 255]);
    expect(at(30, 35)).toEqual([...hexToRgb(t.roles.keyword.color), 255]); // keyword bar
    expect(at(92, 95)).toEqual([...hexToRgb(t.roles.accent.color), 255]); // cursor
  });

  it("follows the theme and is reproducible", () => {
    expect(iconPng(theme)).toEqual(iconPng(theme));
    expect(iconPng(generate(8, "light"))).not.toEqual(iconPng(theme));
  });
});
