/**
 * Writes what the fidelity check (HP-508) needs: three themes as .vsix files plus the sample files, so they can be
 * installed into a throwaway VS Code profile and compared with the preview. Only runs with FIDELITY_OUT set;
 * `ci/fidelity.sh` does that and opens VS Code.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generate } from "../src/engine/theme";
import { buildVsix } from "../src/engine/vsix";
import { SAMPLES } from "../src/preview/samples";

const out = process.env.FIDELITY_OUT;

describe.skipIf(!out)("fidelity fixtures", () => {
  it("writes three themes and the sample files", () => {
    const dir = out!;
    const themes = [
      { id: "fidelity-a", seed: 7, mode: "dark" as const },
      { id: "fidelity-b", seed: 11, mode: "light" as const },
      { id: "fidelity-c", seed: 23, mode: "dark" as const },
    ];
    mkdirSync(join(dir, "samples"), { recursive: true });
    for (const t of themes) {
      const theme = { ...generate(t.seed, t.mode), name: t.id };
      const options = {
        publisher: "hueprint-fidelity",
        id: t.id,
        version: "1.0.0",
        description: `Fidelity check ${t.id}`,
        license: "MIT" as const,
        author: "SyntaxHue",
        year: 2026,
      };
      writeFileSync(join(dir, `${t.id}.vsix`), buildVsix(theme, options));
    }
    for (const s of SAMPLES) writeFileSync(join(dir, "samples", s.file.split("/").pop()!), s.code);
    expect(SAMPLES.length).toBeGreaterThan(0);
  });
});
