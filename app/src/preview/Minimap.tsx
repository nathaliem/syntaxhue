import type { Token } from "./highlight";
import { TAB_COLUMNS } from "./indent";

/** Pixels per character and per line in the minimap; VS Code draws code at about this scale. */
const CHAR_PX = 1;
const LINE_PX = 3;

/**
 * The minimap: every line of the file as a row of small blocks in its token colors, with the slider over the
 * part that is on screen (all of it, in this preview). Decorative, so hidden from assistive tech.
 */
export function Minimap({ lines }: { lines: Token[][] }) {
  return (
    <div className="wb-minimap" aria-hidden="true" data-role="bg">
      <div className="wb-minimap-slider" style={{ height: lines.length * LINE_PX }} />
      {lines.map((tokens, i) => (
        <div key={i} className="wb-minimap-row" style={{ height: LINE_PX }}>
          {tokens.map((t, j) => {
            const width = [...t.text].reduce((w, ch) => w + (ch === "\t" ? TAB_COLUMNS : 1), 0) * CHAR_PX;
            if (!t.text.trim()) return <span key={j} style={{ width, flex: "none" }} />;
            return (
              <span key={j} data-role={t.role ?? "fg"} style={{ width, background: `var(--r-${t.role ?? "fg"})` }} />
            );
          })}
        </div>
      ))}
    </div>
  );
}
