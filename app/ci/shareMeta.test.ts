// @vitest-environment node
import { describe, expect, it } from "vitest";
import { SHARE_CODE, shareHtml } from "../src/server/shareMeta";

const page =
  '<html><head><title>SyntaxHue</title><meta property="og:image" content="/og.png" /></head><body></body></html>';

describe("shareHtml", () => {
  it("swaps in the theme's title and image, marks the page noindex, and escapes the name", () => {
    const out = shareHtml(page, { origin: "https://syntaxhue.dev", code: "pAbc", name: 'A "<b>" theme' });
    expect(out).toContain("<title>A &quot;&lt;b&gt;&quot; theme:");
    expect(out).toContain('content="https://syntaxhue.dev/api/og?t=pAbc"');
    expect(out).toContain('content="https://syntaxhue.dev/s?t=pAbc"');
    expect(out).toMatch(/name="robots" content="noindex/);
    expect(out).not.toContain("<b>");
    expect(out).not.toContain('content="/og.png"');
  });
});

describe("SHARE_CODE", () => {
  it("accepts compact codes only", () => {
    expect(SHARE_CODE.test("p" + "A".repeat(80))).toBe(true);
    expect(SHARE_CODE.test("1.l.old-format")).toBe(false);
    expect(SHARE_CODE.test("p" + "A".repeat(10))).toBe(false);
    expect(SHARE_CODE.test("p" + '"><script>'.repeat(10))).toBe(false);
  });
});
