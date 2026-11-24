import { useEffect, useId, useRef, useState, type Dispatch, type KeyboardEvent } from "react";
import { VIBE_KEYS, type Vibe, type VibeKey } from "../engine/theme";
import { formatVibe, SLIDERS, vibeValueText } from "./vibeLabels";
import type { Action } from "../state";

const BIG_STEP = 0.1;
const clamp = (v: number) => Math.min(1, Math.max(-1, v));

interface Props {
  vibe: Vibe;
  dispatch: Dispatch<Action>;
}

/** The Vibe button in the top bar and the popover with the four global sliders. */
export function VibePanel({ vibe, dispatch }: Props) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const active = VIBE_KEYS.some((k) => vibe[k] !== 0);

  // Closes on Esc (focus goes back to the button) and on a click outside.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
    };
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const commit = (key: VibeKey, value: number) => dispatch({ type: "vibe", key, value, commit: true });

  // Shift + arrow moves 10 times further than a plain arrow.
  const onKeyDown = (key: VibeKey) => (e: KeyboardEvent<HTMLInputElement>) => {
    const dir =
      e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
    if (!e.shiftKey || !dir) return;
    e.preventDefault();
    commit(key, clamp(vibe[key] + dir * BIG_STEP));
  };

  return (
    <div className="vibe-wrap" ref={wrap}>
      <button
        ref={trigger}
        className={"btn" + (open ? " on" : "")}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        title="Vibe: contrast, saturation, warmth, depth"
      >
        Vibe
        {active && <span className="vibe-dot" role="img" aria-label="adjusted" />}
      </button>
      {open && (
        <div className="vibe-pop" id={panelId} role="dialog" aria-label="Vibe">
          <p className="vibe-intro">
            Tweaks the whole theme without changing your colors. Contrast always stays readable.
          </p>
          {VIBE_KEYS.map((key) => {
            const s = SLIDERS[key];
            const v = vibe[key];
            const id = `vibe-${key}`;
            return (
              <div className="vibe-row" key={key}>
                <div className="vibe-head">
                  <label htmlFor={id}>{s.name}</label>
                  <output htmlFor={id} className="vibe-val">
                    {formatVibe(v)}
                  </output>
                  <button
                    className="link"
                    onClick={() => dispatch({ type: "vibeReset", key })}
                    disabled={v === 0}
                    aria-label={`Reset ${s.name}`}
                  >
                    Reset
                  </button>
                </div>
                <input
                  id={id}
                  type="range"
                  min={-1}
                  max={1}
                  step={0.01}
                  value={v}
                  aria-valuetext={vibeValueText(key, v)}
                  onChange={(e) => dispatch({ type: "vibe", key, value: Number(e.target.value), commit: false })}
                  onPointerUp={(e) => commit(key, Number(e.currentTarget.value))}
                  onKeyUp={(e) => commit(key, Number(e.currentTarget.value))}
                  onBlur={(e) => commit(key, Number(e.currentTarget.value))}
                  onKeyDown={onKeyDown(key)}
                />
                <div className="vibe-ends" aria-hidden="true">
                  <span>{s.low}</span>
                  <span>{s.high}</span>
                </div>
              </div>
            );
          })}
          <div className="vibe-foot">
            <button className="btn sm" onClick={() => dispatch({ type: "vibeReset" })} disabled={!active}>
              Reset all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
