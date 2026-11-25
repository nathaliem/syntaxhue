import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

const SHOW_DELAY_MS = 350;

interface Props {
  /** What the tooltip says. Put a shortcut in `shortcut`, not here. */
  text: ReactNode;
  shortcut?: string;
  /** One focusable element. It gets `aria-describedby` while the tooltip is showing. */
  children: ReactElement<{ "aria-describedby"?: string }>;
}

/**
 * A short label for an element, shown on hover (after a short delay) and on keyboard focus, and dismissed with Esc.
 * The handlers sit on a wrapper, so it also works for a disabled button, which gets no pointer events itself.
 */
export function Tooltip({ text, shortcut, children }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((delay: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), delay);
  }, []);
  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setOpen(false);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <span
      className="tip-wrap"
      onPointerEnter={() => show(SHOW_DELAY_MS)}
      onPointerLeave={hide}
      onFocus={(e) => e.target.matches(":focus-visible") && show(0)}
      onBlur={hide}
      onPointerDown={hide}
      onKeyDown={(e) => e.key === "Escape" && open && hide()}
    >
      {cloneElement(children, { "aria-describedby": open ? id : undefined })}
      {open && (
        <span className="tip" role="tooltip" id={id}>
          {text}
          {shortcut && (
            <>
              {" "}
              <kbd>{shortcut}</kbd>
            </>
          )}
        </span>
      )}
    </span>
  );
}
