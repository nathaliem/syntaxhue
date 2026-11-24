import { fitScale, LOGICAL_WIDTH } from "./fitScale";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

export function FitToWidth({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const s = fitScale(o.clientWidth);
      setScale(s);
      setHeight(s < 1 ? i.offsetHeight * s : null);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, []);

  const shrunk = scale < 1;
  return (
    <div ref={outer} className="wb-fit" style={shrunk && height !== null ? { height } : undefined} data-scale={scale}>
      <div
        ref={inner}
        className="wb-fit-inner"
        style={shrunk ? { width: LOGICAL_WIDTH, transform: `scale(${scale})` } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
