import { SCOPES } from "../engine/derive";
import type { HighlighterCore, LanguageRegistration } from "shiki/core";
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

export type Lang = "typescript" | "python" | "rust" | "go" | "html" | "css" | "json" | "markdown";

/** One lazy import per grammar: each becomes its own chunk, fetched only when that language is shown. */
const GRAMMARS: Record<Lang, () => Promise<{ default: LanguageRegistration[] }>> = {
  typescript: () => import("@shikijs/langs/typescript"),
  python: () => import("@shikijs/langs/python"),
  rust: () => import("@shikijs/langs/rust"),
  go: () => import("@shikijs/langs/go"),
  html: () => import("@shikijs/langs/html"),
  css: () => import("@shikijs/langs/css"),
  json: () => import("@shikijs/langs/json"),
  markdown: () => import("@shikijs/langs/markdown"),
};
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

/**
 * VS Code also runs the TypeScript language server, whose semantic tokens override the grammar: the class name in
 * `new Map()` is a `class`, which the theme colors as a type, while the grammar calls it a function. The preview
 * has no language server, so it applies that one rule itself (found by comparing against the real app, HP-508).
 */
export function semanticFixes(lines: Token[][]): Token[][] {
  return lines.map((line) =>
    line.map((t, i) => {
      if (t.role !== "function" || !/^[A-Z]/.test(t.text)) return t;
      const prev = line
        .slice(0, i)
        .reverse()
        .find((p) => p.text.trim());
      return prev?.text.trim() === "new" ? { ...t, role: "type" as const } : t;
    }),
  );
}

/** Plain text with the indentation split off, so a loading skeleton can draw bars that start at the code. */
export function plainTokens(code: string): Token[][] {
  return code.split("\n").map((line) => {
    const indent = /^\s*/.exec(line)![0];
    const rest = line.slice(indent.length);
    return [...(indent ? [{ text: indent, role: null }] : []), ...(rest ? [{ text: rest, role: null }] : [])];
  });
}

let core: Promise<HighlighterCore> | null = null;
const tokenizers = new Map<Lang, Promise<Tokenize>>();

/** Shiki itself (engine and theme) loads once, in its own chunk, the first time any language is wanted. */
function loadCore(): Promise<HighlighterCore> {
  core ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
      import("shiki/core"),
      import("shiki/engine/javascript"),
    ]);
    return createHighlighterCore({ themes: [roleTheme()], langs: [], engine: createJavaScriptRegexEngine() });
  })();
  core.catch(() => (core = null)); // a failed load can be retried
  return core;
}

/** A tokenizer for one language. Fetches its grammar on first use; later calls reuse it. */
export function loadTokenizer(lang: Lang): Promise<Tokenize> {
  let p = tokenizers.get(lang);
  if (!p) {
    p = (async () => {
      const [highlighter, grammar] = await Promise.all([loadCore(), GRAMMARS[lang]()]);
      await highlighter.loadLanguage(grammar.default);
      return (code: string) => {
        const lines = highlighter.codeToTokensBase(code, { lang, theme: THEME }).map((line) =>
          line.map((t) => {
            const role = roleOf.get((t.color ?? "").toLowerCase()) ?? null;
            return { text: t.content, role: role === FG_ROLE ? null : role };
          }),
        );
        return lang === "typescript" ? semanticFixes(lines) : lines;
      };
    })();
    tokenizers.set(lang, p);
    p.catch(() => tokenizers.delete(lang));
  }
  return p;
}
