import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ToastContext, type ToastApi, type ToastOptions } from "./toastContext";

const DURATION_MS = 5000;

/** The popover API puts an element in the top layer, above any open dialog. Older browsers just draw it in place. */
const hasPopover = typeof HTMLElement !== "undefined" && "showPopover" in HTMLElement.prototype;

interface Toast extends ToastOptions {
  id: number;
  message: string;
}

/**
 * Provides `useToast()` and draws the one toast that is showing: bottom-center, gone after 5 seconds, and kept while
 * the pointer or keyboard focus is on it, so there is time to press Undo. It is drawn in the browser's top layer when
 * that exists, so it stays visible above an open dialog or drawer.
 */
export function ToastProvider({ mode, children }: { mode?: "dark" | "light"; children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const next = useRef(0);

  const close = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);
  const startTimer = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), DURATION_MS);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show: (message, options) => {
        setToast({ id: ++next.current, message, ...options });
        startTimer();
      },
    }),
    [startTimer],
  );
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast && (
        <div
          key={toast.id}
          className="toast"
          data-mode={mode}
          role="status"
          aria-label="Notification"
          popover={hasPopover ? "manual" : undefined}
          ref={(el) => {
            if (el && hasPopover && !el.matches(":popover-open")) el.showPopover();
          }}
          onPointerEnter={() => clearTimeout(timer.current)}
          onPointerLeave={startTimer}
          onFocus={() => clearTimeout(timer.current)}
          onBlur={startTimer}
        >
          <span>{toast.message}</span>
          {toast.undo && (
            <button
              type="button"
              className="btn sm"
              onClick={() => {
                toast.undo?.();
                close();
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}
    </ToastContext.Provider>
  );
}
