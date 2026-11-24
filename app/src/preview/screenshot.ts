import { surfaces } from "../engine/derive";
import { type RoleId, type ThemeState } from "../engine/theme";
import { effectiveTheme } from "../engine/vibe";
import { FILES } from "./files";
import type { Token } from "./highlight";
import { loadTokenizer } from "./highlight";
import { TAB_COLUMNS } from "./indent";
import { SAMPLES, type Sample } from "./samples";

/** The part of the canvas API the drawing needs, so it can be tested with a recording stand-in. */
export interface Ctx2D {
  fillStyle: string | CanvasGradient | CanvasPattern;
  font: string;
  textBaseline: CanvasTextBaseline;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number): void;
  measureText(text: string): { width: number };
  scale(x: number, y: number): void;
}

export const SHOT_WIDTH = 1000;
export const SHOT_HEIGHT = 620;
const SCALE = 2;
const FONT_SIZE = 14;
const LINE_H = 21;
const MONO = `"SF Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace`;
const UI = `-apple-system, "Segoe UI", system-ui, sans-serif`;

const TITLE_H = 30;
const ACTIVITY_W = 48;
const SIDEBAR_W = 190;
const TABS_H = 34;
const STATUS_H = 24;
const NUM_W = 46;

/**
 * Draws a picture of the workbench (title bar, activity bar, explorer, tab, editor, status bar) for one sample,
 * from the same surfaces and token roles as the live preview. Simpler than the DOM preview (no hover widget,
 * terminal or minimap), because a canvas has to place every glyph itself.
 */
export function drawScreenshot(ctx: Ctx2D, theme: ThemeState, sample: Sample, lines: Token[][]): void {
  const t = effectiveTheme(theme);
  const s = surfaces(theme);
  const color = (id: RoleId) => t.roles[id].color;
  const rect = (fill: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
  };
  const text = (value: string, x: number, y: number, fill: string, font = `${FONT_SIZE}px ${MONO}`) => {
    ctx.fillStyle = fill;
    ctx.font = font;
    ctx.textBaseline = "middle";
    ctx.fillText(value, x, y);
  };

  ctx.scale(SCALE, SCALE);
  const bodyTop = TITLE_H;
  const bodyH = SHOT_HEIGHT - TITLE_H - STATUS_H;
  const mainX = ACTIVITY_W + SIDEBAR_W;

  rect(s.editor, 0, 0, SHOT_WIDTH, SHOT_HEIGHT);

  // title bar
  rect(s.activityBar, 0, 0, SHOT_WIDTH, TITLE_H);
  for (let i = 0; i < 3; i++) rect(s.border, 14 + i * 18, 11, 9, 9);
  ctx.font = `12px ${UI}`;
  const title = `${sample.file} — ${theme.name}`;
  text(title, (SHOT_WIDTH - ctx.measureText(title).width) / 2, TITLE_H / 2, color("muted"), `12px ${UI}`);

  // activity bar
  rect(s.activityBar, 0, bodyTop, ACTIVITY_W, bodyH);
  rect(color("accent"), 0, bodyTop + 8, 2, 28);
  for (let i = 0; i < 5; i++) rect(i === 0 ? color("fg") : color("muted"), 16, bodyTop + 14 + i * 40, 16, 16);

  // explorer
  rect(s.sidebar, ACTIVITY_W, bodyTop, SIDEBAR_W, bodyH);
  text("EXPLORER", ACTIVITY_W + 16, bodyTop + 18, color("muted"), `600 11px ${UI}`);
  FILES.forEach((f, i) => {
    const y = bodyTop + 46 + i * 22;
    if (f.active) rect(s.selection, ACTIVITY_W, y - 11, SIDEBAR_W, 22);
    const fill = f.active ? color("accent") : f.role ? color(f.role) : color("fg");
    const name = f.active ? sample.file : f.name;
    text(`${f.folder ? "›" : " "} ${name}`, ACTIVITY_W + 12 + f.depth * 12, y, fill, `13px ${UI}`);
    if (f.badge && f.role) text(f.badge, ACTIVITY_W + SIDEBAR_W - 22, y, color(f.role), `600 12px ${UI}`);
  });

  // tab
  rect(s.tabInactive, mainX, bodyTop, SHOT_WIDTH - mainX, TABS_H);
  rect(s.editor, mainX, bodyTop, 150, TABS_H);
  rect(color("accent"), mainX, bodyTop, 150, 2);
  text(sample.file, mainX + 16, bodyTop + TABS_H / 2 + 1, color("fg"), `13px ${UI}`);

  // editor
  const top = bodyTop + TABS_H + 8;
  ctx.font = `${FONT_SIZE}px ${MONO}`;
  const cw = ctx.measureText("M").width || 8.4;
  const codeX = mainX + NUM_W + 17;
  lines.forEach((tokens, i) => {
    const n = i + 1;
    const y = top + i * LINE_H + LINE_H / 2;
    if (n === sample.cursor) rect(s.lineHighlight, mainX, y - LINE_H / 2, SHOT_WIDTH - mainX, LINE_H);
    text(String(n), mainX + NUM_W - 10 - String(n).length * cw, y, n === sample.cursor ? color("fg") : color("muted"));
    if (sample.modified.includes(n)) rect(color("info"), mainX + NUM_W + 2, y - LINE_H / 2, 3, LINE_H);
    else if (sample.added.includes(n)) rect(color("success"), mainX + NUM_W + 2, y - LINE_H / 2, 3, LINE_H);

    let x = codeX;
    for (const tok of tokens) {
      const shown = tok.text.replace(/\t/g, " ".repeat(TAB_COLUMNS));
      const w = shown.length * cw;
      const role = tok.role ?? "fg";
      const word = tok.text.trim().replace(/^["']|["']$/g, "");
      if (n === sample.cursor && word === sample.select && shown.trim())
        rect(s.selection, x, y - LINE_H / 2 + 1, w, LINE_H - 2);
      const styles = t.roles[role].fontStyle;
      const font = `${styles.includes("italic") ? "italic " : ""}${styles.includes("bold") ? "bold " : ""}${FONT_SIZE}px ${MONO}`;
      if (shown.trim()) text(shown, x, y, color(role), font);
      if (shown.trim() && styles.includes("underline")) rect(color(role), x, y + 8, w, 1);
      if (n === sample.error && word === sample.errorWord) rect(color("error"), x, y + 9, w, 2);
      x += w;
    }
    if (n === sample.cursor) rect(color("accent"), x, y - 9, 2, 18);
  });

  // status bar
  rect(color("accent"), 0, SHOT_HEIGHT - STATUS_H, SHOT_WIDTH, STATUS_H);
  const onAccent = s.onAccent;
  const st = SHOT_HEIGHT - STATUS_H / 2;
  text("⎇ main", 12, st, onAccent, `12px ${UI}`);
  text(`Ln ${sample.cursor}, Col 9`, SHOT_WIDTH - 250, st, onAccent, `12px ${UI}`);
  text("UTF-8", SHOT_WIDTH - 150, st, onAccent, `12px ${UI}`);
  text(sample.name, SHOT_WIDTH - 80, st, onAccent, `12px ${UI}`);
}

/** One PNG for a sample, drawn on a real canvas. Needs a browser: throws where canvas is unavailable. */
export async function screenshotPng(theme: ThemeState, sample: Sample): Promise<Uint8Array> {
  const lines = (await loadTokenizer(sample.lang))(sample.code);
  const canvas = document.createElement("canvas");
  canvas.width = SHOT_WIDTH * SCALE;
  canvas.height = SHOT_HEIGHT * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser");
  drawScreenshot(ctx, theme, sample, lines);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (!blob) throw new Error("The browser could not make an image");
  return new Uint8Array(await blob.arrayBuffer());
}

/** A screenshot for every language, in the order of the language switcher. */
export async function allScreenshots(theme: ThemeState): Promise<{ lang: string; label: string; png: Uint8Array }[]> {
  const out = [];
  for (const sample of SAMPLES)
    out.push({ lang: sample.lang, label: sample.name, png: await screenshotPng(theme, sample) });
  return out;
}
