import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  /** The id of the heading inside, which names the dialog. */
  titleId: string;
  className?: string;
  children: ReactNode;
}

/**
 * A modal dialog on the native `<dialog>`: focus is trapped, Esc closes it, and clicking the dim backdrop closes it.
 * The caller owns `open`; `onClose` fires for Esc, the backdrop and `dialog.close()` alike.
 */
export function Dialog({ open, onClose, titleId, className, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={className}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby={titleId}
    >
      {children}
    </dialog>
  );
}

/** A dialog that slides in from the left edge (360 px). Same behaviour as Dialog. */
export function Drawer(props: Omit<Props, "className">) {
  return <Dialog {...props} className="drawer" />;
}
