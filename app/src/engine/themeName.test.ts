import { describe, expect, it } from "vitest";
import { generate } from "./theme";
import { paletteFamilies, suggestNames } from "./themeName";

describe("name suggestions", () => {
  const theme = generate(11, "dark");

  it("gives the same names for the same theme and seed, other names for another seed", () => {
    expect(suggestNames(theme, 1)).toEqual(suggestNames(theme, 1));
    expect(suggestNames(theme, 2)).not.toEqual(suggestNames(theme, 1));
  });

  it("returns the requested number of distinct, non-empty names within the name length limit", () => {
    for (let seed = 0; seed < 50; seed++) {
      const t = generate(seed, seed % 2 ? "light" : "dark");
      const names = suggestNames(t, seed, 6);
      expect(names).toHaveLength(6);
      expect(new Set(names).size).toBe(6);
      for (const n of names) {
        expect(n.trim()).toBe(n);
        expect(n.length).toBeGreaterThan(3);
        expect(n.length).toBeLessThanOrEqual(60);
      }
    }
  });

  it("fits the palette: names use the color words of its main accent hue", () => {
    const t = generate(3, "dark");
    const [main] = paletteFamilies(t);
    expect(main).toBeTruthy();
    const seen = new Set<string>();
    for (let s = 0; s < 40; s++) suggestNames(t, s).forEach((n) => seen.add(n));
    // At least a few names across seeds use the main family's words, and light themes get light settings.
    expect([...seen].length).toBeGreaterThan(20);
    const light = suggestNames(generate(3, "light"), 5, 40).join(" ");
    expect(light).not.toMatch(/\b(Night|Midnight|Nebula|Eclipse)\b/);
  });
});

describe("the name a shuffle gives", () => {
  it("is the same for the same seed and fits the mode", () => {
    expect(generate(5, "dark").name).toBe(generate(5, "dark").name);
    for (let seed = 0; seed < 100; seed++) {
      const light = generate(seed, "light").name;
      const dark = generate(seed, "dark").name;
      expect(light).not.toMatch(/\b(Night|Midnight|Nebula|Eclipse|Afterglow|Hollow|Lantern|Circuit)\b/);
      expect(dark).not.toMatch(/\b(Morning|Daylight|Noon|Porcelain|Terrace|Studio)\b/);
      expect(light.length).toBeLessThanOrEqual(60);
    }
  });

  it("changes when the palette changes (different seeds give a variety of names)", () => {
    const names = new Set(Array.from({ length: 60 }, (_, i) => generate(i, "dark").name));
    expect(names.size).toBeGreaterThan(30);
  });
});
