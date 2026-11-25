import type { ReactNode } from "react";
import { Button, type ButtonProps } from "./Button";
import { cx } from "./cx";
import { Tooltip } from "./Tooltip";

interface Props extends Omit<ButtonProps, "children" | "aria-label" | "title"> {
  /** The accessible name and the tooltip text. Required: an icon alone says nothing to a screen reader. */
  label: string;
  /** Shown in the tooltip, e.g. "⌘Z". */
  shortcut?: string;
  children: ReactNode;
}

/** A square button holding an icon or a glyph, always with a name and a tooltip. */
export function IconButton({ label, shortcut, className, children, ...rest }: Props) {
  return (
    <Tooltip text={label} shortcut={shortcut}>
      <Button aria-label={label} className={cx("icon", className)} {...rest}>
        {children}
      </Button>
    </Tooltip>
  );
}
