import { settle, type Snap } from "./sheetSnap";
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Non-modal sheet pinned to the bottom of the screen: 55 % tall, 90 % when pulled up. The page behind stays
 * usable, so tapping another part of the preview switches the role being edited.
 */
export function BottomSheet({ title, onClose, children }: Props) {
  const [snap, setSnap] = useState<Snap>("half");
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const down = (e: PointerEvent<HTMLElement>) => {
    start.current = e.clientY;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e: PointerEvent<HTMLElement>) => {
    if (start.current !== null) setDrag(e.clientY - start.current);
  };
  const up = (e: PointerEvent<HTMLElement>) => {
    if (start.current === null) return;
    const dy = e.clientY - start.current;
    start.current = null;
    setDrag(null);
    if (Math.abs(dy) < 6) return; // a tap: the handle button's click handles it
    const next = settle(snap, dy);
    if (next === "close") onClose();
    else setSnap(next);
  };

  const height = snap === "full" ? 90 : 55;
  return (
    <section
      className="sheet"
      role="region"
      aria-label={`Edit ${title}`}
      style={{ height: `${height}vh`, transform: drag && drag > 0 ? `translateY(${drag}px)` : undefined }}
      data-snap={snap}
      data-dragging={drag !== null}
    >
      <header className="sheet-head" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <button
          className="sheet-handle"
          aria-label={snap === "full" ? "Make the editor smaller" : "Make the editor taller"}
          onClick={() => setSnap(snap === "full" ? "half" : "full")}
        />
        <h2 className="sheet-title">{title}</h2>
        <button className="btn sm" onClick={onClose} onPointerDown={(e) => e.stopPropagation()}>
          Done
        </button>
      </header>
      <div className="sheet-body">{children}</div>
    </section>
  );
}
