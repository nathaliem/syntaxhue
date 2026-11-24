import { useEffect, useState } from "react";

/** Phones get a bottom sheet instead of the inline editor. Matches DESIGN.md: under 768 px. */
export const MOBILE_QUERY = "(max-width: 767px)";

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => matches());
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(MOBILE_QUERY);
    const on = () => setMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return mobile;
}

function matches(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(MOBILE_QUERY).matches;
}
