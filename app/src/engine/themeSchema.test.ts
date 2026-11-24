import { describe, expect, it } from "vitest";
import { themeFile, workbenchColors } from "./derive";
import { counterpart } from "./extension";
import { generate, ROLE_IDS, VIBE_KEYS, ZERO_VIBE } from "./theme";
import { validateThemeFile } from "./themeSchema";

const good = () => JSON.parse(JSON.stringify(themeFile(generate(7, "dark"))));

describe("exported theme files satisfy the color theme structure", () => {
  const themes = [1, 2, 3, 7, 11, 23, 99].flatMap((s) =>
    (["dark", "light"] as const).map((m) => [`seed ${s} ${m}`, generate(s, m)] as const),
  );
  it.each(themes)("%s", (_n, t) => expect(validateThemeFile(themeFile(t))).toEqual([]));

  it("holds with every vibe slider at its extremes and for the derived other mode", () => {
    const base = generate(7, "dark");
    for (const v of VIBE_KEYS) {
      for (const x of [-1, 1]) {
        const t = { ...base, vibe: { ...ZERO_VIBE, [v]: x } };
        expect(validateThemeFile(themeFile(t)), `${String(v)} ${x}`).toEqual([]);
      }
    }
    expect(validateThemeFile(themeFile(counterpart(base)))).toEqual([]);
  });

  it("holds when every role carries every font style", () => {
    const t = generate(7, "dark");
    const roles = Object.fromEntries(
      ROLE_IDS.map((id) => [id, { ...t.roles[id], fontStyle: ["italic", "bold", "underline"] }]),
    ) as typeof t.roles;
    expect(validateThemeFile(themeFile({ ...t, roles }))).toEqual([]);
  });

  it("only writes color ids in the dotted form VS Code uses, with no duplicates", () => {
    const keys = Object.keys(workbenchColors(generate(7, "dark")));
    expect(keys.length).toBeGreaterThan(100);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("the validator catches what VS Code would reject", () => {
  it("accepts a good file", () => expect(validateThemeFile(good())).toEqual([]));

  it.each([
    ["not an object", [], /JSON object/],
    ["no name", { ...good(), name: " " }, /name/],
    ["bad type", { ...good(), type: "dim" }, /type must be/],
    ["bad semanticHighlighting", { ...good(), semanticHighlighting: "yes" }, /semanticHighlighting/],
    ["colors missing", { ...good(), colors: undefined }, /colors must be an object/],
    ["bad hex", { ...good(), colors: { "editor.background": "red" } }, /not a hex color/],
    ["bad color id", { ...good(), colors: { "editor background": "#000000" } }, /not a valid color id/],
    ["5 digit hex", { ...good(), colors: { foreground: "#12345" } }, /not a hex color/],
    ["tokenColors missing", { ...good(), tokenColors: {} }, /tokenColors must be an array/],
    ["empty scope", { ...good(), tokenColors: [{ scope: [], settings: {} }] }, /scope must be/],
    ["blank scope entry", { ...good(), tokenColors: [{ scope: [" "], settings: {} }] }, /empty or non-string/],
    ["bad token color", { ...good(), tokenColors: [{ scope: "a", settings: { foreground: "#12" } }] }, /foreground/],
    ["bad font style", { ...good(), tokenColors: [{ scope: "a", settings: { fontStyle: "wavy" } }] }, /fontStyle/],
    ["bad semantic selector", { ...good(), semanticTokenColors: { "a b": "#000000" } }, /not a selector/],
    ["bad semantic flag", { ...good(), semanticTokenColors: { class: { italic: "yes" } } }, /italic/],
  ])("rejects %s", (_n, file, message) => {
    expect(validateThemeFile(file).join(" ")).toMatch(message);
  });
});
