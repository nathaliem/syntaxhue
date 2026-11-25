import { describe, expect, it } from "vitest";
import curated from "./__fixtures__/curated-seeds.json";
import ratings from "./__fixtures__/generator-ratings.json";
import { colorDistance, hexToOklch } from "./color";
import { curatedTheme, type CuratedSeed } from "./curated";
import { contrastIssues, generate, HARMONY_NAMES, ROLE_IDS, SYNTAX_IDS, type Mode } from "./theme";

const q = (a: number[], p: number) => [...a].sort((x, y) => x - y)[Math.floor(a.length * p)];

describe("generator quality, per harmony and mode", () => {
  for (const mode of ["dark", "light"] as Mode[]) {
    for (const harmony of HARMONY_NAMES) {
      it(`${harmony} / ${mode}: syntax colors stay apart, spread in lightness and meet contrast`, () => {
        const minDist: number[] = [];
        const spread: number[] = [];
        for (let s = 1; s <= 120; s++) {
          const t = generate(s * 7919, mode, undefined, harmony);
          expect(contrastIssues(t)).toEqual([]);
          let md = Infinity;
          for (let i = 0; i < SYNTAX_IDS.length; i++)
            for (let j = i + 1; j < SYNTAX_IDS.length; j++)
              md = Math.min(md, colorDistance(t.roles[SYNTAX_IDS[i]].color, t.roles[SYNTAX_IDS[j]].color));
          minDist.push(md);
          const ls = SYNTAX_IDS.map((id) => hexToOklch(t.roles[id].color).l);
          spread.push(Math.max(...ls) - Math.min(...ls));
        }
        // Nine in ten themes clear the hard minimum with room to spare (monochrome has the least room in light mode).
        expect(q(minDist, 0.1)).toBeGreaterThanOrEqual(harmony === "monochrome" ? 0.062 : 0.065);
        // Colors that only differ by hue read as one color to many people; keep some lightness movement.
        expect(q(spread, 0.5)).toBeGreaterThanOrEqual(harmony === "monochrome" ? 0.18 : 0.1);
      });
    }
  }
});

describe("curated seeds", () => {
  const list = curated as CuratedSeed[];

  it("has 20 seeds covering every harmony in both modes", () => {
    expect(list).toHaveLength(20);
    for (const h of HARMONY_NAMES)
      for (const m of ["dark", "light"]) expect(list.some((c) => c.harmony === h && c.mode === m)).toBe(true);
  });

  it("still generates the same colors (update with `vitest -u` after a deliberate generator change, then look at /gallery.html)", async () => {
    const out = list.map((c) => ({
      ...c,
      name: curatedTheme(c).name,
      colors: Object.fromEntries(ROLE_IDS.map((id) => [id, curatedTheme(c).roles[id].color])),
    }));
    await expect(JSON.stringify(out, null, 2) + "\n").toMatchFileSnapshot("./__fixtures__/curated-themes.json");
  });
});

describe("blind ratings", () => {
  it("at least 70% of rated shuffles are a usable starting point (3+), once ratings are recorded", () => {
    const rs = ratings.ratings as { score: number }[];
    if (rs.length === 0) return;
    expect(rs.length).toBeGreaterThanOrEqual(40);
    expect(rs.filter((r) => r.score >= 3).length / rs.length).toBeGreaterThanOrEqual(0.7);
  });
});
