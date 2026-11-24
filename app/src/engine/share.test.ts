import { describe, expect, it } from "vitest";
import { decodeTheme, encodeTheme } from "./share";
import { generate, ROLE_IDS, ROLES, THEME_VERSION, type ThemeState } from "./theme";

/** A link made by the first version of share links (before binary links), kept as a frozen fixture. */
const LEGACY_LINK =
  "1.l.Old%2ELink%20Test.f4f0fd2a272f407a20827d905d7700975592117240575cb83d364e955f00485233b631329d5f00006aa01e7729.-,-,-,i,i,ib,-,-,-,-,-,-,-,-,-";
const LEGACY_COLORS =
  "#f4f0fd,#2a272f,#407a20,#827d90,#5d7700,#975592,#117240,#575cb8,#3d364e,#955f00,#485233,#b63132,#9d5f00,#006aa0,#1e7729".split(
    ",",
  );

const payloadBytes = (link: string) =>
  Uint8Array.from(atob(link.slice(1).replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const fromBytes = (bytes: Uint8Array) =>
  "p" +
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

describe("share links", () => {
  it("round-trips everything: colors, mode, name, font styles and locks", () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const t = generate(seed, seed % 2 ? "dark" : "light");
      ROLE_IDS.forEach((id, i) => {
        t.roles[id].locked = i % 3 === 0;
      });
      t.roles.string.fontStyle = ["italic", "bold", "underline"];
      t.roles.keyword.fontStyle = ["underline"];
      t.roles.type.fontStyle = [];
      const back = decodeTheme(encodeTheme(t))!;
      expect(back).toEqual({ ...t, roles: expectRoles(t) });
    }
  });

  it("keeps non-ASCII names and clamps long ones", () => {
    const t = generate(7, "dark");
    t.name = "Crème brûlée 🌙 テーマ";
    expect(decodeTheme(encodeTheme(t))!.name).toBe(t.name);
    t.name = "x".repeat(100);
    expect(decodeTheme(encodeTheme(t))!.name).toHaveLength(60);
    t.name = "";
    expect(decodeTheme(encodeTheme(t))!.name).toBe("");
  });

  it("is under 300 characters for a typical theme, even with a long name", () => {
    const t = generate(8, "light");
    const link = encodeTheme(t);
    expect(link.length).toBeLessThan(150);
    t.name = "A".repeat(60);
    expect(encodeTheme(t).length).toBeLessThan(300);
    expect(link).toMatch(/^p[A-Za-z0-9_-]+$/); // safe in a URL hash with no escaping
  });

  it("starts with the schema version inside the payload", () => {
    expect(payloadBytes(encodeTheme(generate(5, "dark")))[0]).toBe(THEME_VERSION);
  });

  it("refuses links made with another version, unknown flags, or too little data", () => {
    const link = encodeTheme(generate(5, "dark"));
    const bytes = payloadBytes(link);
    const withByte = (i: number, v: number) => {
      const b = bytes.slice();
      b[i] = v;
      return fromBytes(b);
    };
    expect(decodeTheme(withByte(0, THEME_VERSION + 1))).toBeNull();
    expect(decodeTheme(withByte(0, 0))).toBeNull();
    expect(decodeTheme(withByte(1, 2))).toBeNull(); // a flag this version doesn't know
    expect(decodeTheme(fromBytes(bytes.slice(0, 20)))).toBeNull();
    expect(decodeTheme(link)).not.toBeNull();
  });

  it("refuses a name that isn't valid UTF-8", () => {
    const bytes = payloadBytes(encodeTheme(generate(5, "dark")));
    const bad = new Uint8Array([...bytes.subarray(0, 57), 0xff, 0xfe]);
    expect(decodeTheme(fromBytes(bad))).toBeNull();
  });

  it("rejects garbage", () => {
    for (const bad of ["", "p", "pAAAA", "p!!!!", "hello", "1.d.x.y.z", "2.d.Nope.abc.-", "p" + "A".repeat(200)]) {
      expect(decodeTheme(bad), bad).toBeNull();
    }
  });

  it("still opens links made before binary links existed", () => {
    const t = decodeTheme(LEGACY_LINK)!;
    expect(t.name).toBe("Old.Link Test");
    expect(t.mode).toBe("light");
    expect(ROLES.map((r) => t.roles[r.id].color)).toEqual(LEGACY_COLORS);
    expect(t.roles.string.fontStyle).toEqual(["italic", "bold"]);
    expect(t.roles.keyword.fontStyle).toEqual(["italic"]);
    expect(ROLE_IDS.some((id) => t.roles[id].locked)).toBe(false); // legacy links have no locks
  });

  it("legacy links from a different version are still refused", () => {
    expect(decodeTheme(LEGACY_LINK.replace(/^1\./, "2."))).toBeNull();
  });
});

function expectRoles(t: ThemeState) {
  return Object.fromEntries(
    ROLE_IDS.map((id) => [id, { ...t.roles[id], fontStyle: [...t.roles[id].fontStyle].sort(order) }]),
  ) as ThemeState["roles"];
}
const order = (a: string, b: string) =>
  ["italic", "bold", "underline"].indexOf(a) - ["italic", "bold", "underline"].indexOf(b);
