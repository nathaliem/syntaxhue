import { useEffect, useLayoutEffect, useRef, useState, type Dispatch } from "react";
import { ROLE_BY_ID, type RoleId, type ThemeState } from "../engine/theme";
import type { Action } from "../state";
import { RoleEditor } from "./RoleRail";

interface Props {
  roleId: RoleId;
  theme: ThemeState;
  dispatch: Dispatch<Action>;
  onClose: () => void;
}

const GAP = 8;
const MARGIN = 12;

/**
 * Tablets: the role editor as a panel beside the swatch column, level with the swatch that opened it. Esc closes it
 * and returns focus to that swatch; clicking anywhere else closes it, except another swatch (which switches role).
 */
export function RoleEditorPopover({ roleId, theme, dispatch, onClose }: Props) {
  const def = ROLE_BY_ID[roleId];
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const anchor = () => document.querySelector<HTMLElement>(`[data-role="${roleId}"]`);

  // Sits to the right of the swatch's row, moved up if it would run off the bottom of the screen.
  useLayoutEffect(() => {
    const row = anchor();
    const panel = ref.current;
    if (!row || !panel) return;
    const r = row.getBoundingClientRect();
    const top = Math.max(MARGIN, Math.min(r.top, window.innerHeight - panel.offsetHeight - MARGIN));
    setPos({ top, left: r.right + GAP });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
      anchor()?.querySelector<HTMLElement>(".role-main")?.focus();
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || (t as HTMLElement).closest?.(".role")) return;
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("mousedown", onDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId, onClose]);

  return (
    <div
      ref={ref}
      className="pop role-pop"
      role="dialog"
      aria-label={`Edit ${def.label}`}
      style={pos ? { top: pos.top, left: pos.left } : { visibility: "hidden" }}
    >
      <RoleEditor def={def} theme={theme} dispatch={dispatch} />
    </div>
  );
}
