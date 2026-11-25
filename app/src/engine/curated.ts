import { generate, type Harmony, type Mode, type ThemeState } from "./theme";

/** One curated generator input. The gallery page and the regression test both render these. */
export interface CuratedSeed {
  seed: number;
  mode: Mode;
  harmony: Harmony;
}

export function curatedTheme(c: CuratedSeed): ThemeState {
  return generate(c.seed, c.mode, undefined, c.harmony);
}
