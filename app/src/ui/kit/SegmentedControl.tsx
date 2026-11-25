import { useRef, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";

export interface Segment<T extends string> {
  value: T;
  label: ReactNode;
  /** Accessible name when the visible label isn't enough (an abbreviation like "TS"). */
  ariaLabel?: string;
  /** Extra props for this segment's button, for example hover handlers. */
  buttonProps?: ButtonHTMLAttributes<HTMLButtonElement>;
}

interface Props<T extends string> {
  /** Names the group for assistive technology. */
  label: string;
  value: T;
  segments: Segment<T>[];
  onChange: (value: T) => void;
  /** Styling hook; `seg` is the default look (a bordered pill, selected = ink fill). */
  className?: string;
}

/**
 * One choice out of a few. Every segment is a toggle button (`aria-pressed`); the arrow keys, Home and End move the
 * selection to the neighbour and focus it, so it can be driven without Tab.
 */
export function SegmentedControl<T extends string>({ label, value, segments, onChange, className = "seg" }: Props<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const at = refs.current.findIndex((b) => b === document.activeElement);
    if (at < 0) return;
    const last = segments.length - 1;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? at === last
          ? 0
          : at + 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? at === 0
            ? last
            : at - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : -1;
    if (next < 0) return;
    e.preventDefault();
    refs.current[next]?.focus();
    onChange(segments[next].value);
  };

  return (
    <div className={className} role="group" aria-label={label} onKeyDown={onKeyDown}>
      {segments.map((s, i) => (
        <button
          key={s.value}
          type="button"
          ref={(el) => {
            refs.current[i] = el;
          }}
          aria-pressed={s.value === value}
          aria-label={s.ariaLabel}
          onClick={() => onChange(s.value)}
          {...s.buttonProps}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
