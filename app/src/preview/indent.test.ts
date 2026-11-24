import { describe, expect, it } from "vitest";
import { activeGuide, guideColumns, indentUnit, TAB_COLUMNS } from "./indent";
import { SAMPLES } from "./samples";

describe("indentUnit", () => {
  it("finds the smallest indent", () => {
    expect(indentUnit("a\n    b\n        c")).toBe(4);
    expect(indentUnit("a\n  b\n    c")).toBe(2);
    expect(indentUnit("a\nb")).toBe(2);
    expect(indentUnit("a\n\tb")).toBe(2); // tabs don't set the unit
  });
});

describe("guideColumns", () => {
  it("puts one guide per complete level", () => {
    expect(guideColumns("x", 2)).toEqual([]);
    expect(guideColumns("    x", 2)).toEqual([0, 2]);
    expect(guideColumns("      x", 4)).toEqual([0]); // 6 spaces is one complete level of 4
    expect(guideColumns("        x", 4)).toEqual([0, 4]);
  });
  it("draws a guide per tab", () => {
    expect(guideColumns("\t\tx", 2)).toEqual([0, TAB_COLUMNS]);
  });
});

describe("activeGuide", () => {
  const code = ["fn a() {", "  if x {", "    y;", "", "    z;", "  }", "}"];
  it("is the innermost guide around the cursor, through blank lines", () => {
    expect(activeGuide(code, 3, 2)).toEqual({ index: 1, from: 2, to: 4 });
    expect(activeGuide(code, 2, 2)).toEqual({ index: 0, from: 1, to: 5 });
  });
  it("is none on an unindented line", () => {
    expect(activeGuide(code, 1, 2)).toBeNull();
  });
});

describe("samples", () => {
  it.each(SAMPLES)("$name has indentation to draw, and its cursor sits in a guided block or at the top", (s) => {
    const lines = s.code.split("\n");
    const unit = indentUnit(s.code);
    // Markdown prose has no indentation, so it legitimately has no guides.
    if (s.lang !== "markdown") expect(lines.some((l) => guideColumns(l, unit).length > 0)).toBe(true);
    const a = activeGuide(lines, s.cursor, unit);
    if (a) expect(a.from).toBeLessThanOrEqual(s.cursor - 1);
  });
});
