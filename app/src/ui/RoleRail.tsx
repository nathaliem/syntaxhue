import { useEffect, useState, type ClipboardEvent, type Dispatch, type KeyboardEvent } from "react";
import { LockIcon, UnlockIcon, WarningIcon } from "./icons";
import { contrast, fixContrast, hexToOklch, normalizeHex, oklchToHex, type Oklch } from "../engine/color";
import { parseCssColor } from "../engine/parseColor";
import { ROLES, type RoleDef, type RoleId, type ThemeState } from "../engine/theme";
import type { Action } from "../state";
import { Badge, Button, IconButton, Slider } from "./kit";

interface Props {
  theme: ThemeState;
  selected: RoleId | null;
  onSelect: (id: RoleId | null) => void;
  onHover: (id: RoleId | null) => void;
  dispatch: Dispatch<Action>;
  /** Short messages for copy and paste ("Copied #4ba3f7"); the app shows them for a moment. */
  onStatus: (message: string) => void;
  /** False on phones: the editor then lives in a bottom sheet instead of under the row. */
  inlineEditor?: boolean;
  /** Tablets: only the swatch and the lock show, the rest stays available to screen readers. */
  compact?: boolean;
}

const GROUPS: RoleDef["group"][] = ["Base", "Syntax", "Status"];

export function RoleRail({
  theme,
  selected,
  onSelect,
  onHover,
  dispatch,
  onStatus,
  inlineEditor = true,
  compact = false,
}: Props) {
  const allLocked = ROLES.every((r) => theme.roles[r.id].locked);
  return (
    <div className={"rail" + (compact ? " rail-compact" : "")} onMouseLeave={() => onHover(null)}>
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
              inlineEditor={inlineEditor}
              compact={compact}
              onToggle={() => onSelect(selected === def.id ? null : def.id)}
              onHover={onHover}
              dispatch={dispatch}
              onStatus={onStatus}
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
  inlineEditor,
  compact,
  onToggle,
  onHover,
  dispatch,
  onStatus,
}: {
  def: RoleDef;
  theme: ThemeState;
  open: boolean;
  inlineEditor: boolean;
  compact: boolean;
  onToggle: () => void;
  onHover: (id: RoleId | null) => void;
  dispatch: Dispatch<Action>;
  onStatus: (message: string) => void;
}) {
  const role = theme.roles[def.id];
  const bg = theme.roles.bg.color;
  const ratio = def.min ? contrast(role.color, bg) : null;
  const fails = ratio !== null && ratio < def.min;

  // Ctrl/⌘+C on a focused row copies its color; Ctrl/⌘+V pastes any CSS color from the clipboard onto it.
  // Copy listens for the key itself, because browsers differ on whether a copy event fires when nothing is
  // selected; writing to the clipboard needs no permission prompt. Paste uses the paste event, which fires on
  // a focused button everywhere and also needs no prompt. The copy event is still handled (Edit menu).
  const copyColor = async () => {
    try {
      await navigator.clipboard.writeText(role.color);
      onStatus(`Copied ${role.color}`);
    } catch {
      onStatus("Couldn't copy to the clipboard");
    }
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "c") {
      e.preventDefault();
      void copyColor();
    }
  };
  const onCopy = (e: ClipboardEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.clipboardData.setData("text/plain", role.color);
    onStatus(`Copied ${role.color}`);
  };
  const onPaste = (e: ClipboardEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const hex = parseCssColor(e.clipboardData.getData("text"));
    if (!hex) return onStatus("Couldn't read a color from the clipboard");
    dispatch({ type: "color", role: def.id, color: hex, commit: true });
    onStatus(`Pasted ${hex} into ${def.label}`);
  };

  return (
    <div className={"role" + (open ? " open" : "")} data-role={def.id} onMouseEnter={() => onHover(def.id)}>
      <div className="role-row">
        <button
          className="role-main"
          aria-expanded={open}
          aria-controls={open ? `edit-${def.id}` : undefined}
          aria-keyshortcuts="Control+C Meta+C Control+V Meta+V"
          title={
            compact
              ? `${def.label} ${role.color}${ratio !== null ? ` · contrast ${ratio.toFixed(1)}:1${fails ? ", below the readable minimum" : ""}` : ""}`
              : "Click to edit. Copy this color with Ctrl/⌘+C, paste one with Ctrl/⌘+V."
          }
          onClick={onToggle}
          onKeyDown={onKeyDown}
          onCopy={onCopy}
          onPaste={onPaste}
        >
          <span className="swatch" style={{ background: role.color }}>
            {compact && fails && <WarningIcon size={14} className="swatch-warn" />}
          </span>
          <span className="role-label">{def.label}</span>
          <span className="role-hex">{role.color}</span>
          {ratio !== null && (
            <Badge
              tone={fails ? "warn" : "neutral"}
              title={`Contrast ${ratio.toFixed(2)}:1 against background, needs ${def.min}:1`}
            >
              {fails && <WarningIcon size={12} />}
              {ratio.toFixed(1)}
            </Badge>
          )}
        </button>
        <button
          className={"lock" + (role.locked ? " on" : "")}
          aria-pressed={role.locked}
          aria-label={`${role.locked ? "Unlock" : "Lock"} ${def.label}`}
          title={role.locked ? "Locked: shuffle keeps this color" : "Lock to keep this color when shuffling"}
          onClick={() => dispatch({ type: "lock", role: def.id })}
        >
          {role.locked ? <LockIcon size={16} /> : <UnlockIcon size={16} />}
        </button>
      </div>
      {open && inlineEditor && <RoleEditor def={def} theme={theme} dispatch={dispatch} />}
    </div>
  );
}

export function RoleEditor({ def, theme, dispatch }: { def: RoleDef; theme: ThemeState; dispatch: Dispatch<Action> }) {
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
      <Slider
        min={min}
        max={max}
        step={step}
        value={lch[key]}
        track={track}
        onChange={(v) => setFrom({ ...lch, [key]: v }, false)}
        onCommit={(v) => setFrom({ ...lch, [key]: v }, true)}
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
          <Button size="sm" onClick={pick}>
            Pick from screen
          </Button>
        )}
        {def.styleable && (
          <span className="styles" role="group" aria-label="Font style">
            <IconButton
              size="sm"
              label="Italic"
              pressed={role.fontStyle.includes("italic")}
              onClick={() => dispatch({ type: "style", role: def.id, style: "italic" })}
            >
              <i>I</i>
            </IconButton>
            <IconButton
              size="sm"
              label="Bold"
              pressed={role.fontStyle.includes("bold")}
              onClick={() => dispatch({ type: "style", role: def.id, style: "bold" })}
            >
              <b>B</b>
            </IconButton>
            <IconButton
              size="sm"
              label="Underline"
              pressed={role.fontStyle.includes("underline")}
              onClick={() => dispatch({ type: "style", role: def.id, style: "underline" })}
            >
              <u>U</u>
            </IconButton>
          </span>
        )}
      </div>
      {fails && (
        <div className="warn" role="status">
          <span>
            Hard to read: {ratio!.toFixed(1)}:1, needs {def.min}:1.
          </span>
          <Button
            size="sm"
            onClick={() => dispatch({ type: "color", role: def.id, color: fixContrast(role.color, bg, def.min) })}
          >
            Fix contrast
          </Button>
        </div>
      )}
    </div>
  );
}
