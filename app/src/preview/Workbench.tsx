import { describeColor } from "../engine/colorName";
import { type CSSProperties, type MouseEvent } from "react";
import { surfaces, workbenchColors } from "../engine/derive";
import { effectiveTheme } from "../engine/vibe";
import { ROLE_BY_ID, ROLE_IDS, type RoleId, type ThemeState } from "../engine/theme";
import { FILES } from "./files";
import { type Sample } from "./samples";
import { useTokens } from "./useTokens";
import { Minimap } from "./Minimap";
import { activeGuide, guideColumns, indentUnit } from "./indent";

interface Props {
  theme: ThemeState;
  selected: RoleId | null;
  highlighted: RoleId | null;
  onPick: (role: RoleId) => void;
  sample: Sample;
}

export function Workbench({ theme, selected, highlighted, onPick, sample }: Props) {
  const shown = effectiveTheme(theme); // roles with vibe applied; what the user sees and exports
  const s = surfaces(theme);
  const { lines, loading } = useTokens(sample.code, sample.lang);
  const hover = useTokens(sample.hover.signature, sample.lang).lines[0] ?? [];
  const CURSOR_LINE = sample.cursor;
  const unit = indentUnit(sample.code);
  const codeLines = sample.code.split("\n");
  const active = activeGuide(codeLines, sample.cursor, unit);
  const wc = workbenchColors(theme);
  const unquote = (text: string) => text.trim().replace(/^["']|["']$/g, "");

  const vars = {
    "--w-editor": s.editor,
    "--w-sidebar": s.sidebar,
    "--w-activity": s.activityBar,
    "--w-panel": s.panel,
    "--w-tab": s.tabInactive,
    "--w-widget": s.widget,
    "--w-border": s.border,
    "--w-line": s.lineHighlight,
    "--w-sel": s.selection,
    "--w-onaccent": s.onAccent,
    "--w-guide": wc["editorIndentGuide.background1"],
    "--w-guide-active": wc["editorIndentGuide.activeBackground1"],
    "--w-minimap-slider": wc["minimapSlider.background"],
    ...Object.fromEntries(ROLE_IDS.map((id) => [`--r-${id}`, shown.roles[id].color])),
  } as CSSProperties;

  const styleOf = (id: RoleId | null): CSSProperties | undefined => {
    if (!id) return undefined;
    const f = theme.roles[id].fontStyle;
    return {
      fontStyle: f.includes("italic") ? "italic" : "normal",
      fontWeight: f.includes("bold") ? 700 : 400,
      textDecoration: f.includes("underline") ? "underline" : "none",
    };
  };

  const handleClick = (e: MouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-role]");
    if (el?.dataset.role) onPick(el.dataset.role as RoleId);
  };

  const r = (id: RoleId) => ({ "data-role": id, title: ROLE_BY_ID[id].label });

  return (
    <div
      className="wb"
      style={vars}
      data-hl={highlighted ?? selected ?? undefined}
      onClick={handleClick}
      role="img"
      aria-label={`Preview of VS Code in the ${theme.mode} theme “${theme.name}”: ${describeColor(shown.roles.bg.color)} background, ${describeColor(shown.roles.fg.color)} text, showing ${sample.file}. Every color in it can be edited from the color list.`}
    >
      {(highlighted ?? selected) && (
        <style>{`.wb [data-role="${highlighted ?? selected}"]{outline:2px dashed var(--hl-ring);outline-offset:-2px;border-radius:3px}`}</style>
      )}
      <div className="wb-title" {...r("bg")}>
        <span className="wb-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span {...r("muted")}>shuffle.ts — syntaxhue</span>
      </div>

      <div className="wb-body">
        <div className="wb-activity" {...r("bg")} aria-hidden="true">
          {["files", "search", "git", "run", "ext"].map((n, i) => (
            <span key={n} className={"wb-ai" + (i === 0 ? " on" : "")} {...(i === 0 ? r("accent") : r("muted"))}>
              <Icon name={n} />
              {n === "git" && (
                <b className="wb-badge" {...r("accent")}>
                  3
                </b>
              )}
            </span>
          ))}
        </div>

        <div className="wb-side" {...r("bg")}>
          <div className="wb-side-h" {...r("muted")}>
            Explorer
          </div>
          {FILES.map((f) => (
            <div
              key={f.name}
              className={"wb-file" + (f.active ? " active" : "")}
              style={{ paddingLeft: 12 + f.depth * 12 }}
              {...(f.active ? r("accent") : f.role ? r(f.role) : r("fg"))}
            >
              <span className="wb-chev" aria-hidden="true">
                {f.folder ? "›" : ""}
              </span>
              <span className="wb-fname" style={f.role ? { color: `var(--r-${f.role})` } : undefined}>
                {f.active ? sample.file : f.name}
              </span>
              {f.badge && (
                <span className="wb-fbadge" style={{ color: `var(--r-${f.role})` }}>
                  {f.badge}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="wb-main">
          <div className="wb-tabs" {...r("bg")}>
            <span className="wb-tab active" {...r("accent")}>
              {sample.file}
            </span>
            <span className="wb-tab" {...r("muted")}>
              color.ts
            </span>
            <span className="wb-tab" {...r("muted")}>
              export.ts
            </span>
          </div>
          <div className="wb-crumbs" {...r("muted")}>
            src › {sample.file} › {sample.crumb}
          </div>

          <div className="wb-editor" aria-busy={loading} data-loading={loading || undefined} {...r("bg")}>
            {lines.map((tokens, i) => {
              const n = i + 1;
              return (
                <div key={i} className={"wb-ln" + (n === CURSOR_LINE ? " cur" : "")}>
                  <span
                    className="wb-num"
                    {...r("muted")}
                    style={n === CURSOR_LINE ? { color: "var(--r-fg)" } : undefined}
                  >
                    {n}
                  </span>
                  <span
                    className="wb-gutter"
                    style={
                      sample.modified.includes(n)
                        ? { background: "var(--r-info)" }
                        : sample.added.includes(n)
                          ? { background: "var(--r-success)" }
                          : undefined
                    }
                  />
                  <code>
                    {guideColumns(codeLines[i] ?? "", unit).map((col, k) => (
                      <i
                        key={k}
                        className="wb-guide"
                        aria-hidden="true"
                        data-active={active?.index === k && i >= active.from && i <= active.to ? "" : undefined}
                        style={{ left: `${col}ch` }}
                      />
                    ))}
                    {tokens.map((t, j) => {
                      const squiggle = n === sample.error && unquote(t.text) === sample.errorWord;
                      const sel = n === CURSOR_LINE && unquote(t.text) === sample.select;
                      return (
                        <span
                          key={j}
                          className={(squiggle ? "sq " : "") + (sel ? "sel " : "") + (/^\s+$/.test(t.text) ? "ws" : "")}
                          style={{ color: t.role ? `var(--r-${t.role})` : "var(--r-fg)", ...styleOf(t.role) }}
                          {...(squiggle ? r("error") : t.role ? r(t.role) : r("fg"))}
                        >
                          {t.text}
                        </span>
                      );
                    })}
                    {n === CURSOR_LINE && <span className="wb-cursor" {...r("accent")} />}
                  </code>
                </div>
              );
            })}
            <Minimap lines={lines} />
            <div className="wb-hover" style={{ top: `calc(${sample.error} * 1.62 * 13px + 4px)` }} {...r("bg")}>
              <div>
                {hover.map((t, k) => (
                  <span key={k} style={{ color: t.role ? `var(--r-${t.role})` : "var(--r-fg)", ...styleOf(t.role) }}>
                    {t.text}
                  </span>
                ))}
              </div>
              <div className="wb-hover-err" {...r("error")}>
                {sample.hover.error}
              </div>
            </div>
          </div>

          <div className="wb-panel" {...r("bg")}>
            <div className="wb-ptabs">
              <span {...r("muted")}>
                Problems{" "}
                <b className="wb-pcount" {...r("accent")}>
                  1
                </b>
              </span>
              <span className="active" {...r("accent")}>
                Terminal
              </span>
              <span {...r("muted")}>Output</span>
            </div>
            <div className="wb-term">
              <div>
                <span {...r("success")} style={{ color: "var(--r-success)" }}>
                  ➜
                </span>{" "}
                <span {...r("info")} style={{ color: "var(--r-info)" }}>
                  syntaxhue
                </span>{" "}
                <span {...r("fg")}>npm test</span>
              </div>
              <div>
                <span {...r("success")} style={{ color: "var(--r-success)" }}>
                  ✓
                </span>{" "}
                <span {...r("fg")}>contrast.test.ts (12)</span>
              </div>
              <div>
                <span {...r("error")} style={{ color: "var(--r-error)" }}>
                  ✗
                </span>{" "}
                <span {...r("fg")}>shuffle.test.ts</span>{" "}
                <span {...r("warning")} style={{ color: "var(--r-warning)" }}>
                  1 warning
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="wb-status" {...r("accent")}>
        <span>⎇ main</span>
        <span>
          <span className="wb-st-err">✕ 1</span> ⚠ 0
        </span>
        <span className="wb-st-right">Ln {CURSOR_LINE}, Col 9</span>
        <span>UTF-8</span>
        <span>{sample.name}</span>
      </div>
    </div>
  );
}

function Icon({ name }: { name: string }) {
  const p = {
    files: "M5 3h7l4 4v12H5z M12 3v4h4",
    search: "M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z M15.5 15.5 20 20",
    git: "M7 4v12 M7 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4z M17 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z M17 10c0 4-10 2-10 6",
    run: "M7 4l12 8-12 8z",
    ext: "M4 4h7v7H4z M13 13h7v7h-7z M4 13h7v7H4z M15 3l5 5-5 5-5-5z",
  }[name];
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <path d={p} />
    </svg>
  );
}
