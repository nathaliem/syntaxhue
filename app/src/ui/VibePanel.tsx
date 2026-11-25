import { useId, type Dispatch } from "react";
import { HARMONY_NAMES, VIBE_KEYS, type Harmony, type Vibe, type VibeKey } from "../engine/theme";
import { formatVibe, SLIDERS, vibeValueText } from "./vibeLabels";
import type { Action, ChromePref } from "../state";
import { Button, Popover, Slider } from "./kit";

const BIG_STEP = 0.1;

interface Props {
  vibe: Vibe;
  dispatch: Dispatch<Action>;
  /** The generator's hue harmony, with its setter. Left out where only the sliders belong. */
  harmony?: Harmony;
  onHarmony?: (harmony: Harmony) => void;
  /** Which colors the app's own interface uses, with its setter. */
  chrome?: ChromePref;
  onChrome?: (chrome: ChromePref) => void;
}

const CHROME_LABEL: Record<ChromePref, string> = {
  auto: "Follow the theme",
  light: "Always light",
  dark: "Always dark",
};

const HARMONY_LABEL: Record<Harmony, string> = {
  auto: "Auto (a mix)",
  analogous: "Analogous",
  complementary: "Complementary",
  triadic: "Triadic",
  split: "Split complementary",
  monochrome: "Monochrome",
};

/** The four global sliders with their reset buttons. Shown in a popover on larger screens and in a sheet on phones. */
export function VibeControls({ vibe, dispatch, harmony, onHarmony, chrome, onChrome }: Props) {
  const active = VIBE_KEYS.some((k) => vibe[k] !== 0);
  const base = useId();
  return (
    <>
      {harmony && onHarmony && (
        <div className="vibe-row harmony-row">
          <label htmlFor={`${base}-harmony`}>Shuffle harmony</label>
          <select id={`${base}-harmony`} value={harmony} onChange={(e) => onHarmony(e.target.value as Harmony)}>
            {(["auto", ...HARMONY_NAMES] as Harmony[]).map((h) => (
              <option key={h} value={h}>
                {HARMONY_LABEL[h]}
              </option>
            ))}
          </select>
          <p className="vibe-intro">How the hues relate when you shuffle. Colors you already have stay as they are.</p>
        </div>
      )}
      {chrome && onChrome && (
        <div className="vibe-row harmony-row">
          <label htmlFor={`${base}-chrome`}>Interface colors</label>
          <select id={`${base}-chrome`} value={chrome} onChange={(e) => onChrome(e.target.value as ChromePref)}>
            {(["auto", "light", "dark"] as ChromePref[]).map((c) => (
              <option key={c} value={c}>
                {CHROME_LABEL[c]}
              </option>
            ))}
          </select>
          <p className="vibe-intro">The app's own buttons and panels. The preview always shows your theme.</p>
        </div>
      )}
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
export function VibePanel({ vibe, dispatch, harmony, onHarmony, chrome, onChrome }: Props) {
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
      <VibeControls
        vibe={vibe}
        dispatch={dispatch}
        harmony={harmony}
        onHarmony={onHarmony}
        chrome={chrome}
        onChrome={onChrome}
      />
    </Popover>
  );
}
