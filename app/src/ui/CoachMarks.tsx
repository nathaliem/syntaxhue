import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "./kit";

export const COACH_KEY = "hueprint:coach";

interface Step {
  /** The element to point at: `[data-coach="…"]`. */
  anchor: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  { anchor: "shuffle", title: "Shuffle", body: "Press Shuffle (or Space) for a new palette. Lock a color to keep it." },
  { anchor: "preview", title: "Click to edit", body: "Click anything in the preview to change the color behind it." },
  { anchor: "export", title: "Export", body: "When you like it, export it as a VS Code theme, or share a link." },
];

const GAP = 12;
const MARGIN = 12;
const WIDTH = 280;

function isDone(): boolean {
  try {
    return localStorage.getItem(COACH_KEY) === "done";
  } catch {
    return false;
  }
}

function markDone() {
  try {
    localStorage.setItem(COACH_KEY, "done");
  } catch {
    /* storage blocked: the hints will come back next visit, which is acceptable */
  }
}

interface Place {
  top: number;
  left: number;
  above: boolean;
  arrow: number;
}

/**
 * First run: three small notes, one at a time, each pointing at a control. They never take focus or block anything;
 * Skip (or finishing) hides them for good. If a target isn't on screen the step is skipped.
 */
export function CoachMarks() {
  const [done, setDone] = useState(isDone);
  const [index, setIndex] = useState(0);
  const [place, setPlace] = useState<Place | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const finish = useCallback(() => {
    markDone();
    setDone(true);
  }, []);

  const step = STEPS[index];
  const target = () => (done || !step ? null : document.querySelector<HTMLElement>(`[data-coach="${step.anchor}"]`));

  const measure = useCallback(() => {
    const el = target();
    const panel = ref.current;
    if (!el || !panel) return setPlace(null);
    const r = el.getBoundingClientRect();
    const h = panel.offsetHeight;
    const below = r.bottom + GAP + h <= window.innerHeight - MARGIN;
    const top = below ? r.bottom + GAP : Math.max(MARGIN, r.top - GAP - h);
    const left = Math.max(MARGIN, Math.min(r.left + r.width / 2 - WIDTH / 2, window.innerWidth - WIDTH - MARGIN));
    setPlace({ top, left, above: !below, arrow: r.left + r.width / 2 - left });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, index]);

  // A step whose target isn't rendered (e.g. Export inside a menu on a small bar) is passed over.
  useLayoutEffect(() => {
    if (done) return;
    if (!target()) {
      if (index >= STEPS.length - 1) finish();
      else setIndex(index + 1);
      return;
    }
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, index, measure]);

  useEffect(() => {
    if (done) return;
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [done, measure]);

  if (done || !step) return null;
  const last = index === STEPS.length - 1;
  return (
    <div
      ref={ref}
      className={"coach" + (place?.above ? " above" : "")}
      role="note"
      aria-label={`Tip ${index + 1} of ${STEPS.length}: ${step.title}`}
      style={
        place
          ? { top: place.top, left: place.left, width: WIDTH, ["--arrow" as string]: `${place.arrow}px` }
          : { visibility: "hidden", width: WIDTH }
      }
    >
      <p className="coach-body">{step.body}</p>
      <div className="coach-foot">
        <span className="coach-count">
          {index + 1} of {STEPS.length}
        </span>
        <Button size="sm" variant="ghost" onClick={finish}>
          Skip
        </Button>
        <Button size="sm" variant="primary" onClick={() => (last ? finish() : setIndex(index + 1))}>
          {last ? "Got it" : "Next"}
        </Button>
      </div>
    </div>
  );
}
