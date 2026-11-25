/** Every analytics event the code sends must be in the dictionary (HP-1008). Runs with the normal tests. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EVENT_DICTIONARY } from "../src/analytics";

describe("what the code sends", () => {
  it("only calls trackEvent with names from the dictionary", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(f) && !/\.test\.|analytics\.ts$/.test(f)) files.push(p);
      }
    };
    walk(join(process.cwd(), "src"));
    const used = new Set<string>();
    for (const f of files)
      for (const m of readFileSync(f, "utf8").matchAll(/trackEvent\(\s*["'`]([^"'`]+)["'`]/g)) used.add(m[1]);
    for (const name of used) expect(Object.keys(EVENT_DICTIONARY), `unlisted event "${name}"`).toContain(name);
    // Calls with a variable name can't be checked here, so they are not allowed.
    for (const f of files) expect(readFileSync(f, "utf8"), f).not.toMatch(/trackEvent\(\s*[^"'`\s)]/);
  });
});
