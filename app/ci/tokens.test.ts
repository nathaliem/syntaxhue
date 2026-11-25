import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrast, normalizeHex } from "../src/engine/color";

const css = readFileSync(join(__dirname, "../src/index.css"), "utf8");

/** The custom properties declared in the first rule that starts with `selector`. */
function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no rule for ${selector}`);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

const light = tokens(":root");
const dark = { ...light, ...tokens('.app[data-mode="dark"]') };
const hex = (set: Record<string, string>, name: string) => {
  const h = normalizeHex(set[name] ?? "");
  if (!h) throw new Error(`${name} is not a hex color: ${set[name]}`);
  return h;
};

describe("design tokens (DESIGN.md §2)", () => {
  it("define the whole scale", () => {
    const names = [
      ...["paper", "surface", "surface-2", "ink", "ink-2", "line", "brand", "brand-ink", "pass", "warn", "warn-bg"],
      ...["bad", "hl", "scrim"],
      ...["text-display", "text-title", "text-section", "text-body", "text-label", "text-small", "text-value"],
      ...["space-1", "space-2", "space-3", "space-4", "space-5", "space-6", "space-7"],
      ...["radius-sm", "radius-chip", "radius-md", "radius-lg", "radius-xl", "radius-pill"],
      ...["elev-1", "elev-2", "dur-fast", "dur-base", "dur-slow", "ease"],
    ];
    expect(names.filter((n) => !(`--${n}` in light))).toEqual([]);
  });

  it("keep space on the 4 px grid and use the documented values", () => {
    const px = [1, 2, 3, 4, 5, 6, 7].map((i) => parseInt(light[`--space-${i}`]));
    expect(px).toEqual([4, 8, 12, 16, 24, 32, 48]);
    expect(["sm", "chip", "md", "lg", "xl"].map((r) => light[`--radius-${r}`])).toEqual([
      "6px",
      "7px",
      "9px",
      "12px",
      "16px",
    ]);
    expect([light["--dur-fast"], light["--dur-base"], light["--dur-slow"]]).toEqual(["120ms", "200ms", "320ms"]);
  });

  it("give dark chrome its own value for every color that must differ", () => {
    const own = tokens('.app[data-mode="dark"]');
    for (const n of [
      "paper",
      "surface",
      "surface-2",
      "ink",
      "ink-2",
      "line",
      "brand",
      "brand-ink",
      "pass",
      "warn",
      "warn-bg",
    ]) {
      expect(own[`--${n}`], `--${n} in dark`).toBeDefined();
      expect(own[`--${n}`]).not.toBe(light[`--${n}`]);
    }
  });

  for (const [mode, set] of [
    ["light", light],
    ["dark", dark],
  ] as const) {
    describe(`${mode} chrome`, () => {
      it("text-like tokens reach 4.5:1 on paper, surface and surface-2", () => {
        for (const text of ["ink", "ink-2", "brand", "pass", "warn", "bad"]) {
          for (const bg of ["paper", "surface", "surface-2"]) {
            expect(contrast(hex(set, `--${text}`), hex(set, `--${bg}`)), `--${text} on --${bg}`).toBeGreaterThanOrEqual(
              4.5,
            );
          }
        }
      });

      it("keeps readable text on brand and on the warning fill", () => {
        expect(contrast(hex(set, "--brand-ink"), hex(set, "--brand"))).toBeGreaterThanOrEqual(4.5);
        expect(contrast(hex(set, "--warn"), hex(set, "--warn-bg"))).toBeGreaterThanOrEqual(4.5);
      });
    });
  }
});
