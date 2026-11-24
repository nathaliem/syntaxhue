import { describe, expect, it } from "vitest";
import { settingsSnippetText, surfaces, workbenchColors } from "./derive";
import { generate, type ThemeState } from "./theme";
import { effectiveTheme } from "./vibe";

/**
 * Guards the cost of what runs on every slider step. Measured at ~0.1 ms each; the limits are about
 * 20x looser, so this only fails if someone makes derivation dramatically slower (e.g. an accidental
 * loop over all roles per key). The real frame-time check is app/perf/drag-harness.js.
 */
function medianMs(fn: () => void, runs = 60): number {
  for (let i = 0; i < 10; i++) fn(); // warm up
  const times: number[] = [];
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    fn();
    times.push(performance.now() - t0);
  }
  return times.sort((a, b) => a - b)[runs >> 1];
}

describe("derivation stays cheap", () => {
  const base = generate(5, "dark");
  let n = 0;
  // A new theme object each call, like a slider step: nothing can come from the cache.
  const step = (): ThemeState => ({
    ...base,
    vibe: { contrast: 0.5, saturation: -0.4, warmth: 0.3, depth: ((n++ % 50) - 25) / 25 },
  });

  it("vibe + surfaces for one slider step take well under a frame", () => {
    expect(medianMs(() => surfaces(step()))).toBeLessThan(2);
    expect(medianMs(() => effectiveTheme(step()))).toBeLessThan(2);
  });

  it("every workbench key for one slider step takes well under a frame", () => {
    expect(medianMs(() => workbenchColors(step()))).toBeLessThan(3);
  });

  it("the whole exported snippet is cheap enough to rebuild when Export is open", () => {
    expect(medianMs(() => settingsSnippetText(step()))).toBeLessThan(5);
  });
});
