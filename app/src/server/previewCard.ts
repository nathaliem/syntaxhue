import { hexToOklch, oklchToHex, type Hex } from "../engine/color";
import { ROLE_IDS, type ThemeState } from "../engine/theme";

/**
 * The picture a shared link shows in chat apps and social posts: the theme's name, its colors and a few lines of
 * code painted with them. Returned as a plain element tree that `@vercel/og` (Satori) turns into a PNG.
 */

export const CARD_SIZE = { width: 1200, height: 630 } as const;

export interface CardNode {
  type: string;
  props: { style?: Record<string, string | number>; children?: CardChild | CardChild[] };
}
export type CardChild = CardNode | string;

const el = (type: string, style: Record<string, string | number>, children?: CardChild | CardChild[]): CardNode => ({
  type,
  props: { style, children },
});

/** The background nudged a little lighter (dark themes) or darker (light themes), for the code panel. */
function panel(bg: Hex, mode: ThemeState["mode"]): Hex {
  const o = hexToOklch(bg);
  return oklchToHex({ ...o, l: Math.min(1, Math.max(0, o.l + (mode === "dark" ? 0.04 : -0.035))) });
}

type Token = [
  text: string,
  role: "fg" | "muted" | "keyword" | "string" | "function" | "type" | "variable" | "constant" | "operator",
];

/** A font size that keeps the longest word of the name inside the left column (the font is monospaced). */
const nameSize = (name: string) => {
  const longest = Math.max(
    ...clip(name, 40)
      .split(" ")
      .map((w) => w.length),
    1,
  );
  return Math.max(34, Math.min(66, Math.floor(460 / (longest * 0.62))));
};

/** Shortens a name so it fits one line of the code sample. */
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export function previewCard(theme: ThemeState): CardNode {
  const c = (id: keyof ThemeState["roles"]) => theme.roles[id].color;
  const bg = c("bg");
  const code: { indent: number; tokens: Token[] }[] = [
    { indent: 0, tokens: [["// shuffle, tune, export", "muted"]] },
    {
      indent: 0,
      tokens: [
        ["const ", "keyword"],
        ["theme", "variable"],
        [" = ", "operator"],
        ["shuffle", "function"],
        ["();", "fg"],
      ],
    },
    {
      indent: 0,
      tokens: [
        ["export type ", "keyword"],
        ["Palette", "type"],
        [" = {", "fg"],
      ],
    },
    {
      indent: 1,
      tokens: [
        ["name", "variable"],
        [": ", "operator"],
        ["string", "type"],
        [";", "fg"],
      ],
    },
    {
      indent: 1,
      tokens: [
        ["hue", "variable"],
        [": ", "operator"],
        ["278", "constant"],
        [";", "fg"],
      ],
    },
    {
      indent: 1,
      tokens: [
        ["label", "variable"],
        [": ", "operator"],
        [`"${clip(theme.name, 18)}"`, "string"],
        [";", "fg"],
      ],
    },
    { indent: 0, tokens: [["}", "fg"]] },
  ];

  const line = (l: (typeof code)[number]) =>
    el(
      "div",
      { display: "flex", paddingLeft: l.indent * 30, height: 42 },
      l.tokens.map(([text, role]) =>
        el(
          "span",
          {
            color: c(role),
            whiteSpace: "pre",
            fontStyle:
              role === "muted" || (role === "keyword" && theme.roles.keyword.fontStyle.includes("italic"))
                ? "italic"
                : "normal",
            fontWeight: role === "keyword" && theme.roles.keyword.fontStyle.includes("bold") ? 700 : 400,
          },
          text,
        ),
      ),
    );

  return el(
    "div",
    {
      width: "100%",
      boxSizing: "border-box",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 70px",
      background: bg,
      color: c("fg"),
      fontFamily: "JetBrains Mono",
    },
    [
      el("div", { display: "flex", flexDirection: "column", width: 460, flexShrink: 0 }, [
        el(
          "div",
          {
            display: "flex",
            fontSize: nameSize(theme.name),
            fontWeight: 700,
            lineHeight: 1.1,
            color: c("fg"),
          },
          clip(theme.name, 40),
        ),
        el("div", { display: "flex", fontSize: 26, marginTop: 18, color: c("muted") }, `A ${theme.mode} VS Code theme`),
        el(
          "div",
          { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 34, width: 460 },
          ROLE_IDS.filter((id) => id !== "bg").map((id) =>
            el("div", {
              display: "flex",
              width: 52,
              height: 52,
              borderRadius: 12,
              background: c(id),
              border: `2px solid ${c("muted")}55`,
            }),
          ),
        ),
        el("div", { display: "flex", fontSize: 24, marginTop: 40, color: c("muted") }, "SyntaxHue · syntaxhue.dev"),
      ]),
      el(
        "div",
        {
          display: "flex",
          flexDirection: "column",
          width: 500,
          flexShrink: 0,
          padding: "34px 30px",
          borderRadius: 24,
          background: panel(bg, theme.mode),
          border: `2px solid ${c("muted")}44`,
          fontSize: 24,
        },
        code.map(line),
      ),
    ],
  );
}
