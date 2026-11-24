import { describe, expect, it } from "vitest";
import { contrast } from "../color";
import { generate, ROLE_IDS, ROLE_BY_ID, type ThemeState } from "../theme";
import { TARGETS, portInput, runPort, targetById } from "./index";

// One theme per mode, plus a few seeds so a mapping that only works for one palette is caught.
const themes: [string, ThemeState][] = [
  ["dark", { ...generate(7, "dark"), name: "Fixture Dark" }],
  ["light", { ...generate(7, "light"), name: "Fixture Light" }],
  ...[1, 2, 3].flatMap((s): [string, ThemeState][] => [
    [`dark seed ${s}`, generate(s, "dark")],
    [`light seed ${s}`, generate(s, "light")],
  ]),
];

describe("port registry", () => {
  it("has at least one target, with unique ids that targetById finds", () => {
    expect(TARGETS.length).toBeGreaterThan(0);
    expect(new Set(TARGETS.map((t) => t.id)).size).toBe(TARGETS.length);
    for (const t of TARGETS) expect(targetById(t.id)).toBe(t);
    expect(targetById("nope")).toBeUndefined();
  });
});

describe.each(TARGETS.map((t) => [t.id, t] as const))("port %s", (_id, target) => {
  it("says what it is and where the files go", () => {
    expect(target.label.trim()).not.toBe("");
    expect(target.install.trim()).not.toBe("");
  });

  describe.each(themes)("for %s", (_name, theme) => {
    const input = portInput(theme);
    const files = runPort(target, theme);
    const uses = target.uses(input);

    it("writes clean, unique relative file paths with content", () => {
      expect(files.length).toBeGreaterThan(0);
      const paths = files.map((f) => f.path);
      expect(new Set(paths).size).toBe(paths.length);
      for (const f of files) {
        expect(f.path).toMatch(/^[\w.-]+(\/[\w.-]+)*$/);
        expect(f.path.startsWith("/")).toBe(false);
        expect(f.content.length).toBeGreaterThan(0);
      }
    });

    it("is deterministic", () => {
      expect(runPort(target, theme)).toEqual(files);
    });

    it("uses every role, or says why it cannot", () => {
      const used = new Set(uses.map((u) => u.role));
      for (const id of ROLE_IDS) {
        if (target.unused?.[id]) expect(used.has(id), `${id} is listed as unused but is used`).toBe(false);
        else expect(used.has(id), `${id} is not used`).toBe(true);
      }
    });

    it("really writes the colors it says it uses", () => {
      const text = files.map((f) => f.content.toLowerCase()).join("\n");
      for (const u of uses) expect(text, `${u.role} ${u.color}`).toContain(u.color.toLowerCase());
    });

    it("keeps each role's contrast minimum in the target's own mapping", () => {
      for (const u of uses) {
        if (!u.on) continue;
        const min = ROLE_BY_ID[u.role].min;
        expect(contrast(u.color, u.on), `${u.role} on ${u.on}`).toBeGreaterThanOrEqual(min);
      }
    });
  });

  it("matches its snapshot", () => {
    expect(runPort(target, themes[0][1])).toMatchSnapshot();
    expect(runPort(target, themes[1][1])).toMatchSnapshot();
  });
});
