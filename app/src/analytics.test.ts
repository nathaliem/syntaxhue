import { afterEach, describe, expect, it, vi } from "vitest";

const sent: [string, unknown][] = [];
vi.mock("@vercel/analytics", () => ({ track: (n: string, p: unknown) => sent.push([n, p]) }));

import { beforeSend, EVENT_DICTIONARY, resetOnce, trackEvent, type EventName } from "./analytics";

afterEach(() => {
  resetOnce();
  sent.length = 0;
  vi.restoreAllMocks();
  Object.defineProperty(navigator, "doNotTrack", { value: null, configurable: true });
});

describe("analytics", () => {
  it("sends a listed event", () => {
    expect(trackEvent("shuffle")).toBe(true);
    expect(sent).toEqual([["shuffle", {}]]);
  });

  it("sends a once-per-visit event only the first time", () => {
    expect(trackEvent("shuffle")).toBe(true);
    expect(trackEvent("shuffle")).toBe(false);
    expect(trackEvent("export", { type: "file" })).toBe(true);
    expect(trackEvent("export", { type: "file" })).toBe(true);
    expect(sent).toHaveLength(3);
  });

  it("drops an event that is not in the dictionary", () => {
    expect(trackEvent("palette_colors" as EventName)).toBe(false);
    expect(sent).toEqual([]);
  });

  it("keeps only allowed properties and values (no colors, names or free text)", () => {
    trackEvent("export", { type: "extension", theme: "Quiet Harbor", color: "#ff0000" });
    trackEvent("export", { type: "#ff0000" });
    expect(sent).toEqual([
      ["export", { type: "extension" }],
      ["export", {}],
    ]);
  });

  it("sends nothing when the browser sends Do Not Track", () => {
    Object.defineProperty(navigator, "doNotTrack", { value: "1", configurable: true });
    expect(trackEvent("shuffle")).toBe(false);
    expect(beforeSend({ url: "https://syntaxhue.dev/" })).toBeNull();
    expect(sent).toEqual([]);
  });

  it("strips a share link's fragment from page view URLs", () => {
    expect(beforeSend({ url: "https://syntaxhue.dev/#t=abc123" })).toEqual({ url: "https://syntaxhue.dev/" });
  });

  it("strips ?t= and treats /s as the home page", () => {
    expect(beforeSend({ url: "https://syntaxhue.dev/s?t=pabc" })).toEqual({ url: "https://syntaxhue.dev/" });
  });

  it("has a description for every event, and no property that could hold free text", () => {
    for (const [name, e] of Object.entries(EVENT_DICTIONARY)) {
      expect(e.when.length, name).toBeGreaterThan(10);
      for (const values of Object.values(e.props)) expect(values.length).toBeGreaterThan(0);
    }
  });
});
