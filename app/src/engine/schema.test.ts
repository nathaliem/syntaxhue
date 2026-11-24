import { describe, expect, it } from "vitest";
import { migrate, parseTheme, validateTheme, type Migration } from "./schema";
import { generate, THEME_VERSION } from "./theme";
import v1Fixture from "./__fixtures__/theme-v1.json";

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

describe("saved theme schema", () => {
  it("loads a v1 theme saved by an earlier build (frozen fixture)", () => {
    const t = parseTheme(clone(v1Fixture))!;
    expect(t).not.toBeNull();
    expect(t.version).toBe(THEME_VERSION);
    expect(t.name).toBe(v1Fixture.name);
    expect(t.roles.bg.color).toBe(v1Fixture.roles.bg.color);
    expect(t.roles.keyword.fontStyle).toEqual(["italic"]);
    expect(t.roles.string.locked).toBe(true);
  });

  it("round-trips a generated theme through JSON", () => {
    for (const seed of [1, 2, 3]) {
      const t = generate(seed, seed % 2 ? "dark" : "light");
      expect(parseTheme(clone(t))).toEqual(t);
    }
  });

  it("repairs small problems instead of discarding the theme", () => {
    const raw = clone(v1Fixture) as any;
    raw.roles.keyword.fontStyle = ["bold", "sparkly", "underline", 7];
    raw.roles.string.locked = "yes";
    raw.roles.bg.color = raw.roles.bg.color.toUpperCase();
    raw.name = "x".repeat(200);
    const t = parseTheme(raw)!;
    expect(t.roles.keyword.fontStyle).toEqual(["bold", "underline"]);
    expect(t.roles.string.locked).toBe(false);
    expect(t.roles.bg.color).toBe(v1Fixture.roles.bg.color.toLowerCase());
    expect(t.name).toHaveLength(60);
  });

  it("falls back (null) for corrupt or unknown data without throwing", () => {
    const noRole = clone(v1Fixture) as any;
    delete noRole.roles.keyword;
    const badHex = clone(v1Fixture) as any;
    badHex.roles.bg.color = "#12345";
    const badMode = { ...clone(v1Fixture), mode: "sepia" };
    const cases: unknown[] = [
      null,
      undefined,
      "just a string",
      42,
      [],
      {},
      { version: 1 },
      { version: 1, mode: "dark", roles: "nope" },
      noRole,
      badHex,
      badMode,
      { ...clone(v1Fixture), version: 99 }, // saved by a newer app
      { ...clone(v1Fixture), version: 0 },
      { ...clone(v1Fixture), version: "1" },
      { ...clone(v1Fixture), version: 1.5 },
      { ...clone(v1Fixture), version: undefined },
    ];
    for (const c of cases) expect(parseTheme(c)).toBeNull();
  });

  it("validateTheme refuses data that isn't the current version", () => {
    expect(validateTheme({ ...clone(v1Fixture), version: 2 })).toBeNull();
  });
});

describe("migrations", () => {
  // A pretend future: v1 -> v2 renames `mode` to `scheme`, v2 -> v3 adds a field.
  const migrations: Record<number, Migration> = {
    1: ({ mode, ...rest }) => ({ ...rest, scheme: mode }),
    2: (old) => ({ ...old, extra: true }),
  };

  it("applies each step in order up to the current version", () => {
    const out = migrate({ version: 1, mode: "dark" }, migrations, 3)!;
    expect(out).toEqual({ version: 3, scheme: "dark", extra: true });
  });

  it("starts from whatever version the data is at", () => {
    expect(migrate({ version: 2, scheme: "light" }, migrations, 3)).toEqual({
      version: 3,
      scheme: "light",
      extra: true,
    });
  });

  it("leaves current-version data alone", () => {
    const data = { version: 3, scheme: "dark" };
    expect(migrate(data, migrations, 3)).toEqual(data);
  });

  it("returns null when a step is missing, throws, or returns junk", () => {
    expect(migrate({ version: 1 }, { 1: (o) => o }, 3)).toBeNull(); // no 2 -> 3 step
    expect(
      migrate(
        { version: 1 },
        {
          1: () => {
            throw new Error("boom");
          },
        },
        2,
      ),
    ).toBeNull();
    expect(migrate({ version: 1 }, { 1: () => null as never }, 2)).toBeNull();
  });

  it("refuses data from a newer version than this app knows", () => {
    expect(migrate({ version: 4 }, migrations, 3)).toBeNull();
  });
});
