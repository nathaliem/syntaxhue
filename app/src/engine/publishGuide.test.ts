import { describe, expect, it } from "vitest";
import { publishGuide } from "./publishGuide";
import { generate } from "./theme";
import type { ExtensionOptions } from "./extension";

const theme = { ...generate(7, "dark"), name: "Velvet Meadow" };
const o: ExtensionOptions = {
  publisher: "someone",
  version: "1.2.3",
  description: "d",
  license: "MIT",
  author: "A",
  year: 2026,
};

describe("publishGuide", () => {
  it("fills in the file name, publisher and full id", () => {
    const g = publishGuide(theme, o);
    const text = JSON.stringify(g);
    expect(g.file).toBe("velvet-meadow-1.2.3.vsix");
    expect(g.fullId).toBe("someone.velvet-meadow");
    expect(text).toContain("vsce publish --packagePath velvet-meadow-1.2.3.vsix");
    expect(text).toContain("ovsx create-namespace someone");
  });
  it("uses a custom id, and a placeholder before a publisher is typed", () => {
    expect(publishGuide(theme, { ...o, id: "meadow" }).fullId).toBe("someone.meadow");
    expect(publishGuide(theme, { ...o, publisher: "" }).fullId).toBe("<publisher-id>.velvet-meadow");
  });
  it("never contains a real token, only a placeholder", () => {
    const cmds = publishGuide(theme, o).steps.flatMap((s) => s.commands ?? []);
    for (const c of cmds.filter((x) => x.includes("--pat"))) expect(c).toContain("<your-token>");
  });
  it("covers the common failures", () => {
    const f = publishGuide(theme, o)
      .failures.map((x) => x.problem)
      .join(" ");
    expect(f).toMatch(/taken/);
    expect(f).toMatch(/401/);
    expect(f).toMatch(/version/);
    expect(f).toMatch(/repository/);
  });
});
