import { describe, expect, it } from "vitest";
import { describeColor, hueName } from "./colorName";

describe("describeColor", () => {
  it.each([
    ["#000000", "near black"],
    ["#ffffff", "near white"],
    ["#808080", "grey"],
    ["#333333", "dark grey"],
    ["#d9d9d9", "very light grey"],
    ["#ff0000", "vivid red"],
    ["#0000ff", "vivid blue"],
    ["#00a000", "vivid green"],
    ["#ffff00", "very light vivid yellow"],
    ["#1e293b", "dark blue-grey"],
    ["#5b6b7a", "blue-grey"],
    ["#800080", "dark purple"],
  ])("%s is %s", (hex, words) => {
    expect(describeColor(hex)).toBe(words);
  });

  it("always gives some words, for any color", () => {
    for (let i = 0; i < 400; i++) {
      const hex = `#${((i * 2654435761) >>> 8).toString(16).padStart(6, "0").slice(-6)}`;
      expect(describeColor(hex).length, hex).toBeGreaterThan(2);
    }
  });

  it("names every hue angle, wrapping around", () => {
    for (let h = -360; h <= 720; h += 5) expect(hueName(h)).toBeTruthy();
    expect(hueName(0)).toBe(hueName(360));
  });
});
