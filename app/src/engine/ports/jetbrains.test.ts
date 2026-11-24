import { describe, expect, it } from "vitest";
import { ansiPalette } from "../ansi";
import { generate } from "../theme";
import { jetbrains } from "./jetbrains";
import { portInput } from "./port";

const theme = { ...generate(7, "dark"), name: 'Velvet "Meadow" & <Co>' };
const input = portInput(theme);
const parse = (t = theme) => {
  const [f] = jetbrains.files(portInput(t));
  const doc = new DOMParser().parseFromString(f.content, "application/xml");
  return { path: f.path, text: f.content, doc };
};
const HEX6 = /^[0-9a-f]{6}$/;

function attribute(doc: Document, name: string) {
  const el = [...doc.querySelectorAll("attributes > option")].find((o) => o.getAttribute("name") === name);
  if (!el) throw new Error(`missing attribute ${name}`);
  const get = (key: string) =>
    [...el.querySelectorAll("value > option")].find((o) => o.getAttribute("name") === key)?.getAttribute("value");
  return {
    fg: get("FOREGROUND"),
    bg: get("BACKGROUND"),
    font: get("FONT_TYPE"),
    effect: get("EFFECT_TYPE"),
    color: get("EFFECT_COLOR"),
  };
}

describe("JetBrains editor color scheme", () => {
  it("is well-formed XML even when the name has quotes, ampersands and angle brackets", () => {
    const { doc, path } = parse();
    expect(doc.querySelector("parsererror")).toBeNull();
    expect(path).toBe("velvet-meadow-co.icls");
    const root = doc.documentElement;
    expect(root.tagName).toBe("scheme");
    expect(root.getAttribute("name")).toBe(theme.name);
    expect(root.getAttribute("version")).toBe("142");
  });

  it("inherits from Darcula or Default so keys we leave out still work", () => {
    expect(parse().doc.documentElement.getAttribute("parent_scheme")).toBe("Darcula");
    expect(parse({ ...generate(7, "light"), name: "L" }).doc.documentElement.getAttribute("parent_scheme")).toBe(
      "Default",
    );
  });

  it("writes colors as six hex digits, never twice under one name", () => {
    const { doc } = parse();
    const colors = [...doc.querySelectorAll("colors > option")];
    expect(colors.length).toBeGreaterThan(15);
    for (const c of colors) expect(c.getAttribute("value"), c.getAttribute("name")!).toMatch(HEX6);
    const all = [...doc.querySelectorAll("colors > option, attributes > option")].map((o) => o.getAttribute("name"));
    expect(new Set(all).size).toBe(all.length);
    for (const o of doc.querySelectorAll("attributes value > option")) {
      const k = o.getAttribute("name")!;
      const v = o.getAttribute("value")!;
      if (k === "FONT_TYPE") expect(["1", "2", "3"]).toContain(v);
      else if (k === "EFFECT_TYPE") expect(["0", "1", "2"]).toContain(v);
      else expect(v, k).toMatch(HEX6);
    }
  });

  it("sets the editor background and text, and takes syntax colors from the roles", () => {
    const { doc } = parse();
    const hex = (h: string) => h.slice(1);
    expect(attribute(doc, "TEXT")).toMatchObject({ fg: hex(input.roles.fg), bg: hex(input.surfaces.editor) });
    expect(attribute(doc, "DEFAULT_KEYWORD").fg).toBe(hex(input.roles.keyword));
    expect(attribute(doc, "DEFAULT_STRING").fg).toBe(hex(input.roles.string));
    expect(attribute(doc, "DEFAULT_LINE_COMMENT").fg).toBe(hex(input.roles.muted));
    expect(attribute(doc, "DEFAULT_CLASS_NAME").fg).toBe(hex(input.roles.type));
    expect(attribute(doc, "DEFAULT_FUNCTION_DECLARATION").fg).toBe(hex(input.roles.function));
    expect(attribute(doc, "DEFAULT_NUMBER").fg).toBe(hex(input.roles.constant));
    expect(attribute(doc, "DEFAULT_OPERATION_SIGN").fg).toBe(hex(input.roles.operator));
    expect(attribute(doc, "DEFAULT_LOCAL_VARIABLE").fg).toBe(hex(input.roles.variable));
  });

  it("encodes font styles (keyword italic by default) and error waves", () => {
    const { doc } = parse();
    expect(attribute(doc, "DEFAULT_KEYWORD").font).toBe("2");
    expect(attribute(doc, "DEFAULT_STRING").font).toBeUndefined();
    const err = attribute(doc, "ERRORS_ATTRIBUTES");
    expect(err).toMatchObject({ effect: "2", color: input.roles.error.slice(1) });
    const both = {
      ...theme,
      roles: {
        ...theme.roles,
        string: { ...theme.roles.string, fontStyle: ["bold", "italic"] as ("bold" | "italic")[] },
      },
    };
    expect(attribute(parse(both).doc, "DEFAULT_STRING").font).toBe("3");
  });

  it("gives the console the 16 ANSI colors in JetBrains order", () => {
    const { doc } = parse();
    const p = ansiPalette(input);
    const col = (n: string) => attribute(doc, `CONSOLE_${n}_OUTPUT`).fg;
    expect(col("RED")).toBe(p.normal[1].slice(1));
    expect(col("GRAY")).toBe(p.normal[7].slice(1)); // normal white
    expect(col("DARKGRAY")).toBe(p.bright[0].slice(1)); // bright black
    expect(col("CYAN_BRIGHT")).toBe(p.bright[6].slice(1));
    expect(col("WHITE")).toBe(p.bright[7].slice(1));
  });
});
