import type { CSSProperties, KeyboardEvent } from "react";

interface Props {
  id?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Called on every move while dragging or stepping; the change is not final yet. */
  onChange: (value: number) => void;
  /** Called once when the move is over (pointer released, key released, focus left): one undo step. */
  onCommit: (value: number) => void;
  /** How far Shift + arrow moves. Defaults to a tenth of the range. */
  bigStep?: number;
  /** A CSS background for the track, e.g. a gradient that shows what moving along it does. */
  track?: string;
  "aria-valuetext"?: string;
  "aria-label"?: string;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * A range input with the app's behaviour: live updates while dragging, one commit when it ends, and Shift + arrow
 * moving ten times further than a plain arrow. The caller lays out the label and the value.
 */
export function Slider({ value, min, max, step, onChange, onCommit, bigStep, track, ...aria }: Props) {
  const big = bigStep ?? (max - min) / 10;

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const dir =
      e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
    if (!e.shiftKey || !dir) return;
    e.preventDefault();
    const next = clamp(value + dir * big, min, max);
    onChange(next);
    onCommit(next);
  };

  const style: CSSProperties | undefined = track ? { background: track } : undefined;
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      style={style}
      onChange={(e) => onChange(Number(e.target.value))}
      onPointerUp={(e) => onCommit(Number(e.currentTarget.value))}
      onKeyUp={(e) => onCommit(Number(e.currentTarget.value))}
      onBlur={(e) => onCommit(Number(e.currentTarget.value))}
      onKeyDown={onKeyDown}
      {...aria}
    />
  );
}
