import { SCOPES } from "../engine/derive";
import { ROLE_IDS, type RoleId } from "../engine/theme";

export interface Token {
  text: string;
  role: RoleId | null; // null = plain text (fg)
}

/**
 * The preview is tokenized by Shiki, which runs the same TextMate grammars VS Code does, with the same scope
 * table the export uses (`SCOPES`). So a token lands on a role in the preview exactly when VS Code would color
 * it with that role's rule in the exported theme.
 *
 * The Shiki theme is built from that table with a stand-in color per role instead of the real one. Each token
 * then says which role it belongs to (that is what click-to-identify needs), and the real colors, font styles
 * and vibe come from CSS variables. Dragging a slider therefore never re-tokenizes anything.
 */
const FG_ROLE: RoleId = "fg";
const standIn = (role: RoleId) => "#0000" + (ROLE_IDS.indexOf(role) + 1).toString(16).padStart(2, "0");
const roleOf = new Map(ROLE_IDS.map((id) => [standIn(id), id]));

export const LANG = "typescript";
const THEME = "hueprint-roles";

export function roleTheme() {
  return {
    name: THEME,
    type: "dark" as const,
    settings: [
      { settings: { foreground: standIn(FG_ROLE) } },
      ...SCOPES.map(({ role, scope }) => ({ scope, settings: { foreground: standIn(role) } })),
    ],
  };
}

export type Tokenize = (code: string) => Token[][];

/** Plain text, one token per line: what shows while the grammar is still loading. */
export function plainTokens(code: string): Token[][] {
  return code.split("\n").map((text) => [{ text, role: null }]);
}

let loading: Promise<Tokenize> | null = null;

/** Loads Shiki and the TypeScript grammar on first use, in a separate chunk. */
export function loadTokenizer(): Promise<Tokenize> {
  loading ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }, ts] = await Promise.all([
      import("shiki/core"),
      import("shiki/engine/javascript"),
      import("@shikijs/langs/typescript"),
    ]);
    const highlighter = await createHighlighterCore({
      themes: [roleTheme()],
      langs: [ts.default],
      engine: createJavaScriptRegexEngine(),
    });
    return (code) =>
      highlighter.codeToTokensBase(code, { lang: LANG, theme: THEME }).map((line) =>
        line.map((t) => {
          const role = roleOf.get((t.color ?? "").toLowerCase()) ?? null;
          return { text: t.content, role: role === FG_ROLE ? null : role };
        }),
      );
  })();
  loading.catch(() => (loading = null)); // a failed load can be retried
  return loading;
}
