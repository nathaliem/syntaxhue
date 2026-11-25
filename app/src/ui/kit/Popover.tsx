import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from "react";
import { cx } from "./cx";

export interface PopoverTrigger {
  ref: Ref<HTMLButtonElement>;
  /** Spread onto the button: `aria-expanded`, `aria-controls`, `aria-haspopup` and the click handler. */
  props: {
    "aria-expanded": boolean;
    "aria-controls": string | undefined;
    "aria-haspopup": "dialog";
    onClick: () => void;
  };
  open: boolean;
}

interface Props {
  /** Names the panel for assistive technology. */
  label: string;
  /** Renders the button that opens the panel. */
  renderTrigger: (t: PopoverTrigger) => ReactNode;
  /** Extra class for the panel, for its width and padding. */
  className?: string;
  /** The panel content; a function gets `close` so an item inside can dismiss the panel. */
  children: ReactNode | ((close: () => void) => ReactNode);
}

/**
 * A panel under a button. It opens on click, closes on Esc (focus goes back to the button) and on a click outside, and
 * does not trap focus or dim the page, so it suits quick tweaks rather than decisions.
 */
export function Popover({ label, renderTrigger, className, children }: Props) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
      button.current?.focus();
    };
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  return (
    <div className="pop-wrap" ref={wrap}>
      {renderTrigger({
        ref: button,
        open,
        props: {
          "aria-expanded": open,
          "aria-controls": open ? panelId : undefined,
          "aria-haspopup": "dialog",
          onClick: () => setOpen((o) => !o),
        },
      })}
      {open && (
        <div className={cx("pop", className)} id={panelId} role="dialog" aria-label={label}>
          {typeof children === "function" ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
}
