import type { RoleId } from "../engine/theme";

export interface Token {
  text: string;
  role: RoleId | null; // null = plain text (fg)
}

const KEYWORDS = new Set(
  "import export from const let var function return if else for while of in new class extends implements interface type enum async await try catch throw default switch case break continue as typeof keyof readonly public private static".split(" "),
);
const CONSTANTS = new Set(["true", "false", "null", "undefined", "this"]);
const BUILTIN_TYPES = new Set(["string", "number", "boolean", "void", "unknown", "any", "never"]);

const RE = /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|(=>|===|!==|&&|\|\||[-+*/%=<>!?:|&]+)|([{}()[\];,.])|(\s+)|(.)/gm;

/** Small TypeScript-ish tokenizer for the preview. Not a real grammar; M1 swaps in Shiki. */
export function tokenizeLine(line: string): Token[] {
  const out: Token[] = [];
  let m: RegExpExecArray | null;
  RE.lastIndex = 0;
  while ((m = RE.exec(line))) {
    const [text, comment, str, num, ident, op, punct] = m;
    let role: RoleId | null = null;
    if (comment) role = "muted";
    else if (str) role = "string";
    else if (num) role = "constant";
    else if (ident) {
      const rest = line.slice(RE.lastIndex);
      if (KEYWORDS.has(ident)) role = "keyword";
      else if (CONSTANTS.has(ident)) role = "constant";
      else if (BUILTIN_TYPES.has(ident) || /^[A-Z]/.test(ident)) role = /^\s*\(/.test(rest) && !/^[A-Z]/.test(ident) ? "function" : "type";
      else if (/^\s*(<[^>]*>)?\(/.test(rest)) role = "function";
      else if (/^[A-Z_]{2,}$/.test(ident)) role = "constant";
      else role = "variable";
    } else if (op || punct) role = "operator";
    out.push({ text, role });
  }
  return out;
}

export const SAMPLE_TS = `// Pick colors that stay readable on any background
import { contrast, oklch } from "./color";

export type Role = "keyword" | "string" | "type";

interface Palette {
  name: string;
  roles: Map<Role, string>;
  locked: boolean;
}

const MIN_CONTRAST = 4.5;

export async function shuffle(seed: number): Promise<Palette> {
  const hue = (seed * 137.5) % 360;
  const bg = oklch(0.21, 0.02, hue);
  if (contrast(fg, bg) < MIN_CONTRAST) {
    return lighten(fg, 0.05);
  }
  return { name: \`Theme \${seed}\`, roles: new Map(), locked: false };
}`;
