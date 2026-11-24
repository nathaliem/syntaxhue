import { describe, expect, it } from "vitest";
import { loadTokenizer } from "./highlight";
import { SAMPLES } from "./samples";

/** The preview reserves this many lines, so switching language never resizes it. */
const MAX_LINES = 24;
const unquote = (t: string) => t.trim().replace(/^["']|["']$/g, "");

describe.each(SAMPLES)("$name sample", (sample) => {
  const lines = sample.code.split("\n");

  it("fits the preview and keeps its marks inside the file", () => {
    expect(lines.length).toBeLessThanOrEqual(MAX_LINES);
    for (const n of [sample.cursor, sample.error, ...sample.modified, ...sample.added]) {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(lines.length);
    }
    expect(sample.cursor).not.toBe(sample.error);
  });

  it("has its selected word and its squiggled word as real tokens on those lines", async () => {
    const tokens = (await loadTokenizer(sample.lang))(sample.code);
    const has = (line: number, word: string) => tokens[line - 1].some((t) => unquote(t.text) === word);
    expect(has(sample.cursor, sample.select)).toBe(true);
    expect(has(sample.error, sample.errorWord)).toBe(true);
  });

  it("is colored by more than one role, with the code intact", async () => {
    const tokens = (await loadTokenizer(sample.lang))(sample.code);
    expect(tokens.map((l) => l.map((t) => t.text).join(""))).toEqual(lines);
    expect(new Set(tokens.flat().map((t) => t.role)).size).toBeGreaterThanOrEqual(3);
  });
});

it("offers the eight languages once each", () => {
  expect(SAMPLES.map((s) => s.lang)).toEqual(["typescript", "python", "rust", "go", "html", "css", "json", "markdown"]);
});
