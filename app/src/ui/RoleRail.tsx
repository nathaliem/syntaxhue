import { useEffect, useState, type Dispatch } from "react";
import { contrast, fixContrast, hexToOklch, normalizeHex, oklchToHex, type Oklch } from "../engine/color";
import { parseCssColor } from "../engine/parseColor";
import { ROLES, type RoleDef, type RoleId, type ThemeState } from "../engine/theme";
import type { Action } from "../state";

interface Props {
  theme: ThemeState;
  selected: RoleId | null;
  onSelect: (id: RoleId | null) => void;
  onHover: (id: RoleId | null) => void;
  dispatch: Dispatch<Action>;
}

const GROUPS: RoleDef["group"][] = ["Base", "Syntax", "Status"];

export function RoleRail({ theme, selected, onSelect, onHover, dispatch }: Props) {
  const allLocked = ROLES.every((r) => theme.roles[r.id].locked);
  return (
    <div className="rail" onMouseLeave={() => onHover(null)}>
      {GROUPS.map((g) => (
        <section key={g} className="rail-group" aria-labelledby={`grp-${g}`}>
          <div className="rail-group-h">
            <h2 id={`grp-${g}`}>{g}</h2>
            {g === "Base" && (
              <button className="link" onClick={() => dispatch({ type: "lockAll", locked: !allLocked })}>
                {allLocked ? "Unlock all" : "Lock all"}
              </button>
            )}
          </div>
          {ROLES.filter((r) => r.group === g).map((def) => (
            <RoleRow
              key={def.id}
              def={def}
              theme={theme}
              open={selected === def.id}
              onToggle={() => onSelect(selected === def.id ? null : def.id)}
              onHover={onHover}
              dispatch={dispatch}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

function RoleRow({
  def,
  theme,
  open,
  onToggle,
  onHover,
  dispatch,
}: {
  def: RoleDef;
  theme: ThemeState;
  open: boolean;
  onToggle: () => void;
  onHover: (id: RoleId | null) => void;
  dispatch: Dispatch<Action>;
}) {
  const role = theme.roles[def.id];
  const bg = theme.roles.bg.color;
  const ratio = def.min ? contrast(role.color, bg) : null;
  const fails = ratio !== null && ratio < def.min;

  return (
    <div className={"role" + (open ? " open" : "")} onMouseEnter={() => onHover(def.id)}>
      <div className="role-row">
        <button className="role-main" aria-expanded={open} aria-controls={`edit-${def.id}`} onClick={onToggle}>
          <span className="swatch" style={{ background: role.color }} />
          <span className="role-label">{def.label}</span>
          <span className="role-hex">{role.color}</span>
          {ratio !== null && (
            <span
              className={"ratio" + (fails ? " bad" : "")}
              title={`Contrast ${ratio.toFixed(2)}:1 against background, needs ${def.min}:1`}
            >
              {fails ? "⚠ " : ""}
              {ratio.toFixed(1)}
            </span>
          )}
        </button>
        <button
          className={"lock" + (role.locked ? " on" : "")}
          aria-pressed={role.locked}
          aria-label={`${role.locked ? "Unlock" : "Lock"} ${def.label}`}
          title={role.locked ? "Locked: shuffle keeps this color" : "Lock to keep this color when shuffling"}
          onClick={() => dispatch({ type: "lock", role: def.id })}
        >
          <LockIcon locked={role.locked} />
        </button>
      </div>
      {open && <Editor def={def} theme={theme} dispatch={dispatch} />}
    </div>
  );
}

function Editor({ def, theme, dispatch }: { def: RoleDef; theme: ThemeState; dispatch: Dispatch<Action> }) {
  const role = theme.roles[def.id];
  const bg = theme.roles.bg.color;
  const [lch, setLch] = useState<Oklch>(() => hexToOklch(role.color));
  const [hexText, setHexText] = useState(role.color);
  const [typingHex, setTypingHex] = useState(false);

  // Sync when the color changes from outside (shuffle, undo, click in preview).
  useEffect(() => {
    if (oklchToHex(lch) !== role.color) setLch(hexToOklch(role.color));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role.color]);
  // Never rewrite the hex field while someone is typing in it.
  useEffect(() => {
    if (!typingHex) setHexText(role.color);
  }, [role.color, typingHex]);

  const commitHex = () => {
    setTypingHex(false);
    const hex = parseCssColor(hexText);
    // Short forms like #abc are only expanded once typing is done; one undo step per edit.
    if (hex) dispatch({ type: "color", role: def.id, color: hex, commit: true });
    else setHexText(role.color);
  };

  const setFrom = (next: Oklch, commit: boolean) => {
    setLch(next);
    dispatch({ type: "color", role: def.id, color: oklchToHex(next), commit });
  };

  const ratio = def.min ? contrast(role.color, bg) : null;
  const fails = ratio !== null && ratio < def.min;

  const slider = (
    key: keyof Oklch,
    label: string,
    min: number,
    max: number,
    step: number,
    fmt: (v: number) => string,
    track: string,
  ) => (
    <label className="slider">
      <span className="slider-l">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={lch[key]}
        style={{ background: track }}
        onChange={(e) => setFrom({ ...lch, [key]: Number(e.target.value) }, false)}
        onPointerUp={() => dispatch({ type: "color", role: def.id, color: oklchToHex(lch), commit: true })}
        onKeyUp={() => dispatch({ type: "color", role: def.id, color: oklchToHex(lch), commit: true })}
      />
      <span className="slider-v">{fmt(lch[key])}</span>
    </label>
  );

  const stops = (f: (t: number) => Oklch) =>
    `linear-gradient(90deg, ${Array.from({ length: 9 }, (_, i) => oklchToHex(f(i / 8))).join(",")})`;

  const eyedropper = "EyeDropper" in window;
  const pick = async () => {
    try {
      // @ts-expect-error EyeDropper is not in lib.dom yet
      const res = await new window.EyeDropper().open();
      const hex = normalizeHex(res.sRGBHex);
      if (hex) dispatch({ type: "color", role: def.id, color: hex });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="editor" id={`edit-${def.id}`}>
      <p className="hint">{def.hint}</p>
      {slider(
        "l",
        "Lightness",
        0,
        1,
        0.005,
        (v) => `${Math.round(v * 100)}%`,
        stops((t) => ({ ...lch, l: t })),
      )}
      {slider(
        "c",
        "Chroma",
        0,
        0.37,
        0.002,
        (v) => v.toFixed(2),
        stops((t) => ({ ...lch, c: t * 0.37 })),
      )}
      {slider(
        "h",
        "Hue",
        0,
        360,
        1,
        (v) => `${Math.round(v)}°`,
        stops((t) => ({ ...lch, h: t * 360 })),
      )}
      <div className="editor-row">
        <label className="hex-in">
          <span className="sr-only">Hex color</span>
          <input
            value={hexText}
            spellCheck={false}
            onFocus={() => setTypingHex(true)}
            placeholder="#rrggbb"
            title="Hex, rgb(), hsl() or oklch()"
            onChange={(e) => {
              setHexText(e.target.value);
              // Live preview only for complete values: 6-digit hex or a closed color function.
              const v = e.target.value.trim();
              const complete = /^#?[0-9a-fA-F]{6}$/.test(v) || /^[a-z]+\(.*\)$/i.test(v);
              const hex = complete ? parseCssColor(v) : null;
              if (hex) dispatch({ type: "color", role: def.id, color: hex, commit: false });
            }}
            onPaste={(e) => {
              // Pasting a whole color applies it right away, as one undo step.
              const hex = parseCssColor(e.clipboardData.getData("text"));
              if (!hex) return;
              e.preventDefault();
              setHexText(hex);
              dispatch({ type: "color", role: def.id, color: hex, commit: true });
            }}
            onBlur={commitHex}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            aria-invalid={!parseCssColor(hexText)}
          />
        </label>
        {eyedropper && (
          <button className="btn sm" onClick={pick}>
            Pick from screen
          </button>
        )}
        {def.styleable && (
          <span className="styles" role="group" aria-label="Font style">
            <button
              className={"btn sm icon" + (role.fontStyle.includes("italic") ? " on" : "")}
              aria-pressed={role.fontStyle.includes("italic")}
              onClick={() => dispatch({ type: "style", role: def.id, style: "italic" })}
              title="Italic"
            >
              <i>I</i>
            </button>
            <button
              className={"btn sm icon" + (role.fontStyle.includes("bold") ? " on" : "")}
              aria-pressed={role.fontStyle.includes("bold")}
              onClick={() => dispatch({ type: "style", role: def.id, style: "bold" })}
              title="Bold"
            >
              <b>B</b>
            </button>
            <button
              className={"btn sm icon" + (role.fontStyle.includes("underline") ? " on" : "")}
              aria-pressed={role.fontStyle.includes("underline")}
              onClick={() => dispatch({ type: "style", role: def.id, style: "underline" })}
              title="Underline"
            >
              <u>U</u>
            </button>
          </span>
        )}
      </div>
      {fails && (
        <div className="warn" role="status">
          <span>
            Hard to read: {ratio!.toFixed(1)}:1, needs {def.min}:1.
          </span>
          <button
            className="btn sm"
            onClick={() => dispatch({ type: "color", role: def.id, color: fixContrast(role.color, bg, def.min) })}
          >
            Fix contrast
          </button>
        </div>
      )}
    </div>
  );
}

function LockIcon({ locked }: { locked: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="4" y="9" width="12" height="8" rx="2" fill={locked ? "currentColor" : "none"} />
      <path d={locked ? "M7 9V6a3 3 0 0 1 6 0v3" : "M7 9V6a3 3 0 0 1 5.8-1"} />
    </svg>
  );
}
