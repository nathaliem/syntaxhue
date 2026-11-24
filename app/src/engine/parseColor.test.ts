import { describe, expect, it } from "vitest";
import { hexToOklch } from "./color";
import { parseCssColor } from "./parseColor";

describe("parseCssColor", () => {
  it("reads hex in every CSS length, with or without #", () => {
    expect(parseCssColor("#FF8800")).toBe("#ff8800");
    expect(parseCssColor("ff8800")).toBe("#ff8800");
    expect(parseCssColor("#f80")).toBe("#ff8800");
    expect(parseCssColor("#f80a")).toBe("#ff8800"); // alpha ignored
    expect(parseCssColor("#ff8800cc")).toBe("#ff8800");
    expect(parseCssColor("  #abc  ")).toBe("#aabbcc");
  });

  it("reads rgb() and rgba() in both syntaxes", () => {
    expect(parseCssColor("rgb(255, 136, 0)")).toBe("#ff8800");
    expect(parseCssColor("rgb(255 136 0)")).toBe("#ff8800");
    expect(parseCssColor("rgba(255, 136, 0, 0.5)")).toBe("#ff8800");
    expect(parseCssColor("rgb(255 136 0 / 50%)")).toBe("#ff8800");
    expect(parseCssColor("RGB(255,136,0)")).toBe("#ff8800");
    expect(parseCssColor("rgb(100%, 0%, 50%)")).toBe("#ff0080");
    expect(parseCssColor("rgb(300, -5, 0)")).toBe("#ff0000"); // clamped
  });

  it("reads hsl() and hsla()", () => {
    expect(parseCssColor("hsl(0, 100%, 50%)")).toBe("#ff0000");
    expect(parseCssColor("hsl(120 100% 25%)")).toBe("#008000");
    expect(parseCssColor("hsl(240deg 100% 50%)")).toBe("#0000ff");
    expect(parseCssColor("hsla(210, 50%, 40%, 0.8)")).toBe("#336699");
    expect(parseCssColor("hsl(0.5turn 100% 50%)")).toBe("#00ffff");
    expect(parseCssColor("hsl(-120, 100%, 50%)")).toBe("#0000ff"); // hue wraps
    expect(parseCssColor("hsl(0, 0%, 100%)")).toBe("#ffffff");
    expect(parseCssColor("hsl(0, 0%, 0%)")).toBe("#000000");
  });

  it("reads oklch() and round-trips our own colors", () => {
    const o = hexToOklch("#336699");
    const text = `oklch(${o.l.toFixed(4)} ${o.c.toFixed(4)} ${o.h.toFixed(2)})`;
    expect(parseCssColor(text)).toBe("#336699");
    expect(parseCssColor(`oklch(${(o.l * 100).toFixed(2)}% ${o.c.toFixed(4)} ${o.h.toFixed(2)}deg / 0.5)`)).toBe(
      "#336699",
    );
    expect(parseCssColor("oklch(1 0 0)")).toBe("#ffffff");
    expect(parseCssColor("oklch(0 0 0)")).toBe("#000000");
    expect(parseCssColor("oklch(0.7 none none)")).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("brings out-of-gamut oklch() into sRGB, keeping lightness and hue close", () => {
    const out = parseCssColor("oklch(0.7 0.4 30)")!;
    expect(out).toMatch(/^#[0-9a-f]{6}$/);
    const back = hexToOklch(out);
    expect(back.l).toBeCloseTo(0.7, 1);
    expect(Math.abs(back.h - 30)).toBeLessThan(8);
  });

  it("returns null for things that are not (supported) colors", () => {
    for (const bad of [
      "",
      "   ",
      "red",
      "#12",
      "#12345",
      "#1234567",
      "#gg0000",
      "rgb(1, 2)",
      "rgb(1, 2, 3, 4, 5)",
      "rgb(1 2 3 4)",
      "rgb(1, 2, x)",
      "rgb(1, 2, 3",
      "rgb 1 2 3",
      "rgb(1, 2 3)/ 4",
      "rgb(1, 2, 3 / 0.5)",
      "rgb(1 2 3 /)",
      "rgb(1 2 3 / 0.5 / 0.2)",
      "rgb(1 2 3 / abc)",
      "hsl(0, 100%)",
      "hsl(abc, 50%, 50%)",
      "oklch(0.5 0.1)",
      "oklch(0.5 0.1 90 120)",
      "oklch(abc 0.1 90)",
      "lab(50 20 30)",
      "rgb(1,2,3); drop table",
    ]) {
      expect(parseCssColor(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});
