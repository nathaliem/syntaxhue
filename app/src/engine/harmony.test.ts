import { describe, expect, it } from "vitest";
import { contrastIssues, distinctness, generate, HARMONY_NAMES, ROLE_IDS } from "./theme";
import { hexToOklch } from "./color";

/** Largest circular distance, in degrees, between the first hue and any other. */
const hueSpread = (hues: number[]) =>
  Math.max(
    ...hues.map((h) => {
      const d = Math.abs(h - hues[0]) % 360;
      return Math.min(d, 360 - d);
    }),
  );

describe("harmony option", () => {
  it("lists monochrome with the others", () => {
    expect(HARMONY_NAMES).toEqual(["analogous", "complementary", "triadic", "split", "monochrome"]);
  });

  it("auto never picks monochrome and does not change existing seeds", () => {
    const a = generate(42, "dark");
    expect(generate(42, "dark", undefined, "auto")).toEqual(a);
  });

  it("monochrome keeps the accent hues together, readable and distinct, in both modes (200 seeds)", () => {
    for (const mode of ["dark", "light"] as const) {
      for (let seed = 1; seed <= 200; seed++) {
        const t = generate(seed, mode, undefined, "monochrome");
        expect(contrastIssues(t), `seed ${seed} ${mode}`).toEqual([]);
        expect(distinctness(t), `seed ${seed} ${mode}`).toBeGreaterThanOrEqual(1);
        const hues = (["keyword", "string", "function", "type", "constant"] as const).map(
          (id) => hexToOklch(t.roles[id].color).h,
        );
        expect(hueSpread(hues)).toBeLessThan(40);
      }
    }
  });

  it("each named harmony is deterministic for a seed and different from another harmony", () => {
    for (const h of HARMONY_NAMES) expect(generate(7, "dark", undefined, h)).toEqual(generate(7, "dark", undefined, h));
    expect(generate(7, "dark", undefined, "triadic")).not.toEqual(generate(7, "dark", undefined, "monochrome"));
  });

  it("keeps locked colors when shuffling with a harmony", () => {
    const base = generate(3, "dark");
    base.roles.keyword.locked = true;
    const next = generate(9, "dark", base, "monochrome");
    expect(next.roles.keyword.color).toBe(base.roles.keyword.color);
    expect(ROLE_IDS.length).toBeGreaterThan(0);
  });
});
