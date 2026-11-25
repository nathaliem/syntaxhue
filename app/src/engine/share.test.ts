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

/** A binary link made before vibe existed (payload version 1), kept as a frozen fixture. */
const V1_BINARY_LINK = "pAQEgAAAQBgAAAAAA9PD9KicvQHoggn2QXXcAl1WSEXJAV1y4PTZOlV8ASFIztjEynV8AAGqgHncpRnJvemVuIFYx";

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

  it("round-trips which colors were set by hand, and adds nothing when none were", () => {
    const t = generate(2, "dark");
    const plain = encodeTheme(t);
    t.roles.accent.picked = true;
    t.roles.string.picked = true;
    t.vibe = { contrast: 0.2, saturation: 0, warmth: 0, depth: 0 };
    const back = decodeTheme(encodeTheme(t))!;
    expect(ROLE_IDS.filter((id) => back.roles[id].picked)).toEqual(["accent", "string"]);
    expect(back.vibe).toEqual(t.vibe);
    expect(decodeTheme(plain)!.roles.accent.picked).toBeUndefined();
  });

  it("round-trips vibe, including negative values, and leaves it out when all 0", () => {
    const t = generate(3, "dark");
    const plain = encodeTheme(t);
    t.vibe = { contrast: 0.35, saturation: -0.8, warmth: 1, depth: -0.01 };
    const link = encodeTheme(t);
    expect(decodeTheme(link)!.vibe).toEqual(t.vibe);
    expect(link.length - plain.length).toBeLessThanOrEqual(6); // 4 bytes
    expect(decodeTheme(plain)!.vibe).toEqual({ contrast: 0, saturation: 0, warmth: 0, depth: 0 });
  });

  it("refuses vibe bytes that are out of range or cut off", () => {
    const t = generate(3, "dark");
    t.vibe = { contrast: 0.5, saturation: 0, warmth: 0, depth: 0 };
    const bytes = payloadBytes(encodeTheme(t));
    const bad = bytes.slice();
    bad[57] = 127; // first vibe byte = 1.27, outside -1..1
    expect(decodeTheme(fromBytes(bad))).toBeNull();
    expect(decodeTheme(fromBytes(bytes.slice(0, 59)))).toBeNull(); // vibe flag set but bytes missing
  });

  it("opens a link made before vibe existed, with vibe at 0", () => {
    const t = decodeTheme(V1_BINARY_LINK)!;
    expect(t.name).toBe("Frozen V1");
    expect(t.mode).toBe("light");
    expect(t.roles.string.locked).toBe(true);
    expect(t.roles.keyword.fontStyle).toEqual(["bold", "underline"]);
    expect(t.roles.bg.color).toBe("#f4f0fd");
    expect(t.vibe).toEqual({ contrast: 0, saturation: 0, warmth: 0, depth: 0 });
  });

  it("refuses a vibe flag in a version 1 payload", () => {
    const b = payloadBytes(V1_BINARY_LINK).slice();
    b[1] |= 2;
    expect(decodeTheme(fromBytes(b))).toBeNull();
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
    expect(decodeTheme(withByte(1, 8))).toBeNull(); // a flag this version doesn't know
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
