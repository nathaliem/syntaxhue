import { useMemo, type CSSProperties, type MouseEvent } from "react";
import { surfaces } from "../engine/derive";
import { effectiveTheme } from "../engine/vibe";
import { ROLE_BY_ID, ROLE_IDS, type RoleId, type ThemeState } from "../engine/theme";
import { SAMPLE_TS, tokenizeLine } from "./tokenize";

interface Props {
  theme: ThemeState;
  selected: RoleId | null;
  highlighted: RoleId | null;
  onPick: (role: RoleId) => void;
}

/** Line with the error squiggle and the line the cursor sits on. */
const SQUIGGLE_LINE = 18;
const CURSOR_LINE = 16;

const FILES: { name: string; depth: number; role?: RoleId; badge?: string; folder?: boolean; active?: boolean }[] = [
  { name: "src", depth: 0, folder: true },
  { name: "engine", depth: 1, folder: true },
  { name: "color.ts", depth: 2 },
  { name: "shuffle.ts", depth: 2, active: true, role: "warning", badge: "M" },
  { name: "export.ts", depth: 2, role: "success", badge: "U" },
  { name: "contrast.ts", depth: 2, role: "error", badge: "1" },
  { name: "App.tsx", depth: 1 },
  { name: "package.json", depth: 0 },
  { name: "README.md", depth: 0 },
];

export function Workbench({ theme, selected, highlighted, onPick }: Props) {
  const shown = effectiveTheme(theme); // roles with vibe applied; what the user sees and exports
  const s = surfaces(theme);
  const lines = useMemo(() => SAMPLE_TS.split("\n").map(tokenizeLine), []);

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
      aria-label="Preview of VS Code with your theme. Click any part to edit the color behind it."
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
        <span {...r("muted")}>shuffle.ts — hueprint</span>
      </div>

      <div className="wb-body">
        <nav className="wb-activity" {...r("bg")} aria-hidden="true">
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
        </nav>

        <aside className="wb-side" {...r("bg")}>
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
                {f.name}
              </span>
              {f.badge && (
                <span className="wb-fbadge" style={{ color: `var(--r-${f.role})` }}>
                  {f.badge}
                </span>
              )}
            </div>
          ))}
        </aside>

        <main className="wb-main">
          <div className="wb-tabs" {...r("bg")}>
            <span className="wb-tab active" {...r("accent")}>
              shuffle.ts
            </span>
            <span className="wb-tab" {...r("muted")}>
              color.ts
            </span>
            <span className="wb-tab" {...r("muted")}>
              export.ts
            </span>
          </div>
          <div className="wb-crumbs" {...r("muted")}>
            src › engine › shuffle.ts › shuffle
          </div>

          <div className="wb-editor" {...r("bg")}>
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
                      n >= 16 && n <= 18
                        ? { background: "var(--r-info)" }
                        : n === 12
                          ? { background: "var(--r-success)" }
                          : undefined
                    }
                  />
                  <code>
                    {tokens.map((t, j) => {
                      const squiggle = n === SQUIGGLE_LINE && t.text === "lighten";
                      const sel = n === CURSOR_LINE && t.text === "bg";
                      return (
                        <span
                          key={j}
                          className={(squiggle ? "sq " : "") + (sel ? "sel" : "")}
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
            <div className="wb-hover" {...r("bg")}>
              <div>
                <span style={{ color: "var(--r-keyword)", ...styleOf("keyword") }}>function</span>{" "}
                <span style={{ color: "var(--r-function)" }}>lighten</span>
                <span style={{ color: "var(--r-operator)" }}>(</span>
                <span style={{ color: "var(--r-variable)" }}>hex</span>
                <span style={{ color: "var(--r-operator)" }}>:</span>{" "}
                <span style={{ color: "var(--r-type)" }}>string</span>
                <span style={{ color: "var(--r-operator)" }}>):</span>{" "}
                <span style={{ color: "var(--r-type)" }}>string</span>
              </div>
              <div className="wb-hover-err" {...r("error")}>
                Cannot find name 'lighten'. ts(2304)
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
                  hueprint
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
        </main>
      </div>

      <footer className="wb-status" {...r("accent")}>
        <span>⎇ main</span>
        <span>
          <span className="wb-st-err">✕ 1</span> ⚠ 0
        </span>
        <span className="wb-st-right">Ln {CURSOR_LINE}, Col 9</span>
        <span>UTF-8</span>
        <span>TypeScript</span>
      </footer>
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
