// @vitest-environment node
/** Renders the shared-theme card with the real image library and checks it is a 1200x630 PNG. Runs in Node. */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generate } from "../src/engine/theme";
import { renderCard } from "../src/server/renderCard";

const font = (file: string) => readFileSync(join(process.cwd(), "public/fonts", file));
const fonts = [
  {
    name: "JetBrains Mono",
    data: font("jetbrains-mono-latin-400-normal.woff"),
    weight: 400 as const,
    style: "normal" as const,
  },
  {
    name: "JetBrains Mono",
    data: font("jetbrains-mono-latin-700-normal.woff"),
    weight: 700 as const,
    style: "normal" as const,
  },
  {
    name: "JetBrains Mono",
    data: font("jetbrains-mono-latin-400-italic.woff"),
    weight: 400 as const,
    style: "italic" as const,
  },
];

const render = (seed: number, mode: "dark" | "light") => renderCard(generate(seed, mode), fonts);

describe("shared theme card", () => {
  it("renders dark and light themes to a 1200x630 PNG", async () => {
    for (const [seed, mode] of [
      [7, "dark"],
      [12, "light"],
    ] as const) {
      const png = await render(seed, mode);
      expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
      const dv = new DataView(png.buffer);
      expect([dv.getUint32(16), dv.getUint32(20)]).toEqual([1200, 630]);
      expect(png.length).toBeGreaterThan(5_000);
      if (process.env.CARD_OUT) writeFileSync(`${process.env.CARD_OUT}-${mode}.png`, png);
    }
  });
});
