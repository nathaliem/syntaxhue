import { describe, expect, it } from "vitest";
import { generate } from "../engine/theme";
import { surfaces } from "../engine/derive";
import { effectiveTheme } from "../engine/vibe";
import { loadTokenizer } from "./highlight";
import { SAMPLES } from "./samples";
import { drawScreenshot, SHOT_HEIGHT, SHOT_WIDTH, type Ctx2D } from "./screenshot";

/** Remembers what was drawn, with the fill color in force at that moment. */
function recorder() {
  const rects: { fill: string; x: number; y: number; w: number; h: number }[] = [];
  const texts: { text: string; fill: string; font: string; x: number; y: number }[] = [];
  const ctx: Ctx2D = {
    fillStyle: "",
    font: "",
    textBaseline: "alphabetic",
    fillRect(x, y, w, h) {
      rects.push({ fill: String(this.fillStyle), x, y, w, h });
    },
    fillText(text, x, y) {
      texts.push({ text, fill: String(this.fillStyle), font: this.font, x, y });
    },
    measureText: (t) => ({ width: t.length * 8.4 }),
    scale() {},
  };
  return { ctx, rects, texts };
}

const theme = generate(7, "dark");
const draw = async (lang: string) => {
  const sample = SAMPLES.find((s) => s.lang === lang)!;
  const r = recorder();
  drawScreenshot(r.ctx, theme, sample, (await loadTokenizer(sample.lang))(sample.code));
  return { ...r, sample };
};

describe("screenshot", () => {
  it("paints the editor background first, over the whole picture", async () => {
    const { rects } = await draw("typescript");
    expect(rects[0]).toEqual({ fill: surfaces(theme).editor, x: 0, y: 0, w: SHOT_WIDTH, h: SHOT_HEIGHT });
  });

  it("draws every line of code with the colors of its roles", async () => {
    const { texts, sample } = await draw("python");
    const t = effectiveTheme(theme);
    const drawn = texts.map((x) => x.text).join(" ");
    for (const word of ["def", "shuffle", "Palette", "MIN_CONTRAST"]) expect(drawn).toContain(word);
    expect(texts.find((x) => x.text === "def")!.fill).toBe(t.roles.keyword.color);
    expect(texts.find((x) => x.text === "shuffle")!.fill).toBe(t.roles.function.color);
    expect(texts.some((x) => x.text === String(sample.code.split("\n").length))).toBe(true); // last line number
  });

  it("marks the cursor line, the selected word and the squiggled word", async () => {
    const { rects, sample } = await draw("rust");
    const s = surfaces(theme);
    const t = effectiveTheme(theme);
    expect(rects.some((r) => r.fill === s.lineHighlight)).toBe(true);
    expect(rects.some((r) => r.fill === s.selection && r.h < 21 && r.w < 100)).toBe(true);
    expect(rects.some((r) => r.fill === t.roles.error.color && r.h === 2)).toBe(true);
    expect(rects.some((r) => r.fill === t.roles.info.color)).toBe(true); // modified gutter
    expect(sample.modified.length).toBeGreaterThan(0);
  });

  it("applies the role font styles", async () => {
    const withStyle = {
      ...theme,
      roles: {
        ...theme.roles,
        keyword: { ...theme.roles.keyword, fontStyle: ["italic", "bold"] as ("italic" | "bold")[] },
      },
    };
    const sample = SAMPLES[0];
    const r = recorder();
    drawScreenshot(r.ctx, withStyle, sample, (await loadTokenizer(sample.lang))(sample.code));
    expect(r.texts.find((x) => x.text === "import")!.font).toMatch(/^italic bold /);
  });

  it.each(SAMPLES)("$name: draws without leaving the picture", async (sample) => {
    const { rects, texts } = await draw(sample.lang);
    expect(rects.length).toBeGreaterThan(15);
    for (const x of texts) {
      expect(x.y).toBeGreaterThan(0);
      expect(x.y).toBeLessThan(SHOT_HEIGHT);
    }
    expect(texts.some((x) => x.text === sample.name)).toBe(true); // status bar language
  });
});
