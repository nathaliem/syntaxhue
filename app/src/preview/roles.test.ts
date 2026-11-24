import { describe, expect, it } from "vitest";
import type { RoleId } from "../engine/theme";
import { loadTokenizer, type Lang } from "./highlight";
import { SAMPLES } from "./samples";

/**
 * Which role a token in each sample belongs to. These are what VS Code does with the exported theme (same
 * grammars, same scope table), so a change here is a change in what users get, not just in the preview.
 */
const EXPECTED: [Lang, string, RoleId][] = [
  ["typescript", "import", "keyword"],
  ["typescript", "Promise", "type"],
  ["typescript", "shuffle", "function"],
  ["typescript", "MIN_CONTRAST", "constant"],
  ["python", "def", "keyword"],
  ["python", "MIN_CONTRAST", "constant"],
  ["python", "int", "type"],
  ["python", "# Pick colors that stay readable on any background", "muted"],
  ["rust", "fn", "keyword"],
  ["rust", "color", "type"],
  ["rust", "MIN_CONTRAST", "constant"],
  ["rust", "Option", "type"],
  ["go", "func", "keyword"],
  ["go", "Shuffle", "function"],
  ["go", "nil", "constant"],
  ["html", "button", "type"],
  ["html", "disabled", "function"],
  ["html", '"button"', "string"],
  ["css", "padding", "type"],
  ["css", "0b1020", "constant"],
  ["css", "not-allowed", "constant"],
  ["json", "foreground", "type"],
  ["json", '"#4ba3f7"', "string"],
  ["markdown", "Features", "function"],
  ["markdown", "settings.json", "string"],
  ["markdown", "https://syntaxhue.dev", "constant"],
  ["markdown", "Free and made by one person.", "muted"],
];

describe("token roles", () => {
  it.each(EXPECTED)("%s: %s is %s", async (lang, text, role) => {
    const sample = SAMPLES.find((s) => s.lang === lang)!;
    const tokens = (await loadTokenizer(lang))(sample.code).flat();
    const hit = tokens.filter((t) => t.text.trim().replace(/^["']|["']$/g, "") === text.replace(/^["']|["']$/g, ""));
    expect(hit.length, `no token "${text}"`).toBeGreaterThan(0);
    expect(hit.map((t) => t.role)).toContain(role);
  });

  it("no sample is left mostly uncolored", async () => {
    for (const s of SAMPLES) {
      const tokens = (await loadTokenizer(s.lang))(s.code)
        .flat()
        .filter((t) => t.text.trim());
      const plain = tokens.filter((t) => t.role === null).length;
      // Markdown prose and HTML text are legitimately plain; everything else should be mostly colored.
      const limit = s.lang === "markdown" || s.lang === "html" ? 0.7 : 0.35;
      expect(plain / tokens.length, s.lang).toBeLessThan(limit);
    }
  });
});
