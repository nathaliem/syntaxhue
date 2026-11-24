/** A tab is drawn this many columns wide in the preview (matches `tab-size` in the CSS). */
export const TAB_COLUMNS = 2;

/** Spaces per indent level in `code`: the smallest indent found (2 or 4 in practice); 2 if nothing is indented. */
export function indentUnit(code: string): number {
  let unit = Infinity;
  for (const line of code.split("\n")) {
    const spaces = /^ +(?=\S)/.exec(line)?.[0].length ?? 0;
    if (spaces > 0) unit = Math.min(unit, spaces);
  }
  return Number.isFinite(unit) ? unit : 2;
}

/** Columns where an indent guide starts on this line, one per complete indent level, counted from the left. */
export function guideColumns(line: string, unit: number): number[] {
  const ws = /^[ \t]*/.exec(line)![0];
  const cols: number[] = [];
  let col = 0;
  let spaces = 0;
  for (const ch of ws) {
    if (ch === "\t") {
      cols.push(col);
      col += TAB_COLUMNS;
    } else {
      spaces++;
      col++;
      if (spaces % unit === 0) cols.push(col - unit);
    }
  }
  return cols;
}

/**
 * The guide VS Code highlights: the innermost one around the cursor line. Returns the 0-based guide index and
 * the 0-based range of lines it spans (blank lines inside the block keep it going), or null when the cursor
 * line is not indented.
 */
export function activeGuide(
  lines: string[],
  cursorLine: number,
  unit: number,
): { index: number; from: number; to: number } | null {
  const levels = (i: number) => guideColumns(lines[i], unit).length;
  const level = levels(cursorLine - 1);
  if (level === 0) return null;
  const inside = (i: number) => lines[i].trim() === "" || levels(i) >= level;
  let from = cursorLine - 1;
  let to = cursorLine - 1;
  while (from > 0 && inside(from - 1)) from--;
  while (to < lines.length - 1 && inside(to + 1)) to++;
  while (lines[from].trim() === "") from++;
  while (lines[to].trim() === "") to--;
  return { index: level - 1, from, to };
}
