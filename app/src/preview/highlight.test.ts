import { describe, expect, it } from "vitest";
import { SCOPES } from "../engine/derive";
import { tokenRules } from "../engine/derive";
import { generate } from "../engine/theme";
import { loadTokenizer, plainTokens, roleTheme } from "./highlight";
import { SAMPLE_TS } from "./sample";

const roleAt = async (code: string, text: string) => {
  const tokenize = await loadTokenizer();
  for (const line of tokenize(code)) for (const t of line) if (t.text === text) return t.role;
  throw new Error(`no token "${text}"`);
};

describe("Shiki tokenizer", () => {
  it("keeps the code intact: every line round-trips", async () => {
    const tokenize = await loadTokenizer();
    const lines = tokenize(SAMPLE_TS).map((l) => l.map((t) => t.text).join(""));
    expect(lines).toEqual(SAMPLE_TS.split("\n"));
  });

  it("gives common tokens the roles VS Code's scopes would", async () => {
    const code = `import { a } from "./x"; // note\nconst n = 4.5;\nfunction f(p: string): Map<string, number> { return g(p) }`;
    expect(await roleAt(code, "import")).toBe("keyword");
    expect(await roleAt(code, '"./x"')).toBe("string");
    expect(await roleAt(code, "// note")).toBe("muted");
    expect(await roleAt(code, "4.5")).toBe("constant");
    expect(await roleAt(code, "f")).toBe("function");
    expect(await roleAt(code, "Map")).toBe("type");
    expect(await roleAt(code, "p")).toBe("variable");
  });

  it("only produces roles that exist", async () => {
    const tokenize = await loadTokenizer();
    const roles = new Set(tokenize(SAMPLE_TS).flatMap((l) => l.map((t) => t.role)));
    expect(roles.size).toBeGreaterThan(5);
    for (const r of roles) expect(r === null || SCOPES.some((s) => s.role === r) || r === "fg").toBe(true);
  });

  it("builds its theme from the same scope table as the export", () => {
    const rules = roleTheme().settings.filter((s) => "scope" in s);
    expect(rules.map((r) => (r as { scope: string[] }).scope)).toEqual(
      tokenRules(generate(1, "dark")).map((r) => r.scope),
    );
  });

  it("plain tokens are one fg token per line", () => {
    expect(plainTokens("a\nb")).toEqual([[{ text: "a", role: null }], [{ text: "b", role: null }]]);
  });
});
