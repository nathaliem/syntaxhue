import type { ReactNode } from "react";
import { cx } from "./cx";

interface Props {
  /** warn adds the warning colors; never rely on color alone, so put a symbol or word in the children too. */
  tone?: "neutral" | "warn";
  title?: string;
  children: ReactNode;
}

/** A small pill for a short value such as a contrast ratio. */
export function Badge({ tone = "neutral", title, children }: Props) {
  return (
    <span className={cx("badge", tone === "warn" && "warn")} title={title}>
      {children}
    </span>
  );
}
