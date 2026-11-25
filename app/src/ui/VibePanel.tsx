import { useId, type Dispatch } from "react";
import { VIBE_KEYS, type Vibe, type VibeKey } from "../engine/theme";
import { formatVibe, SLIDERS, vibeValueText } from "./vibeLabels";
import type { Action } from "../state";
import { Button, Popover, Slider } from "./kit";

const BIG_STEP = 0.1;

interface Props {
  vibe: Vibe;
  dispatch: Dispatch<Action>;
}

/** The four global sliders with their reset buttons. Shown in a popover on larger screens and in a sheet on phones. */
export function VibeControls({ vibe, dispatch }: Props) {
  const active = VIBE_KEYS.some((k) => vibe[k] !== 0);
  const base = useId();
  return (
    <>
      <p className="vibe-intro">Tweaks the whole theme without changing your colors. Contrast always stays readable.</p>
      {VIBE_KEYS.map((key: VibeKey) => {
        const s = SLIDERS[key];
        const v = vibe[key];
        const id = `${base}-${key}`;
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
            <Slider
              id={id}
              min={-1}
              max={1}
              step={0.01}
              value={v}
              bigStep={BIG_STEP}
              aria-valuetext={vibeValueText(key, v)}
              onChange={(value) => dispatch({ type: "vibe", key, value, commit: false })}
              onCommit={(value) => dispatch({ type: "vibe", key, value, commit: true })}
            />
            <div className="vibe-ends" aria-hidden="true">
              <span>{s.low}</span>
              <span>{s.high}</span>
            </div>
          </div>
        );
      })}
      <div className="vibe-foot">
        <Button size="sm" onClick={() => dispatch({ type: "vibeReset" })} disabled={!active}>
          Reset all
        </Button>
      </div>
    </>
  );
}

/** The Vibe button in the top bar and the popover with the four global sliders. */
export function VibePanel({ vibe, dispatch }: Props) {
  const active = VIBE_KEYS.some((k) => vibe[k] !== 0);

  return (
    <Popover
      label="Vibe"
      className="vibe-pop"
      renderTrigger={({ ref, open, props }) => (
        <Button
          ref={ref}
          className={open ? "on" : undefined}
          title="Vibe: contrast, saturation, warmth, depth"
          {...props}
        >
          Vibe
          {active && <span className="vibe-dot" role="img" aria-label="adjusted" />}
        </Button>
      )}
    >
      <VibeControls vibe={vibe} dispatch={dispatch} />
    </Popover>
  );
}
