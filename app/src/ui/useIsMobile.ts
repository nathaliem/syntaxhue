import { useEffect, useState } from "react";

/** Phones are under 768 px wide, tablets 768 to 1199 px, desktops 1200 px and up (DESIGN.md §3). */
export const MOBILE_QUERY = "(max-width: 767px)";
export const TABLET_QUERY = "(min-width: 768px) and (max-width: 1199px)";
/** Below this the top bar has no room for Undo and Redo, so they move into the ⋯ menu. */
export const COMPACT_BAR_QUERY = "(max-width: 1099px)";

const supported = () => typeof window.matchMedia === "function";

/** Whether a media query matches right now, kept up to date. */
export function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => supported() && window.matchMedia(query).matches);
  useEffect(() => {
    if (!supported()) return;
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return matches;
}

export type Breakpoint = "desktop" | "tablet" | "mobile";

export function useBreakpoint(): Breakpoint {
  const mobile = useMedia(MOBILE_QUERY);
  const tablet = useMedia(TABLET_QUERY);
  return mobile ? "mobile" : tablet ? "tablet" : "desktop";
}

/** Phones get a bottom sheet instead of the inline editor. */
export function useIsMobile(): boolean {
  return useMedia(MOBILE_QUERY);
}
