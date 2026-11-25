import { useRef, type Dispatch } from "react";
import { ROLES, type RoleId, type ThemeState } from "../engine/theme";
import type { Action } from "../state";

const LONG_PRESS_MS = 500;

interface Props {
  theme: ThemeState;
  selected: RoleId | null;
  onSelect: (id: RoleId) => void;
  dispatch: Dispatch<Action>;
}

/**
 * Phones: every role as a swatch in a row that scrolls sideways. Tap opens that role's sheet; a long press locks or
 * unlocks it (the sheet also has a Lock button, for anyone who can't long-press).
 */
export function SwatchStrip({ theme, selected, onSelect, dispatch }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const longPressed = useRef(false);

  return (
    <ul className="strip-row" aria-label="Theme colors">
      {ROLES.map((def) => {
        const role = theme.roles[def.id];
        return (
          <li key={def.id}>
            <button
              className={"strip-swatch" + (selected === def.id ? " open" : "") + (role.locked ? " locked" : "")}
              style={{ background: role.color }}
              aria-label={`${def.label} ${role.color}${role.locked ? ", locked" : ""}`}
              aria-expanded={selected === def.id}
              onPointerDown={() => {
                longPressed.current = false;
                clearTimeout(timer.current);
                timer.current = setTimeout(() => {
                  longPressed.current = true;
                  dispatch({ type: "lock", role: def.id });
                }, LONG_PRESS_MS);
              }}
              onPointerUp={() => clearTimeout(timer.current)}
              onPointerLeave={() => clearTimeout(timer.current)}
              onPointerCancel={() => clearTimeout(timer.current)}
              onContextMenu={(e) => e.preventDefault()}
              onClick={() => {
                if (longPressed.current) {
                  longPressed.current = false; // that press already locked it
                  return;
                }
                onSelect(def.id);
              }}
            >
              {role.locked && (
                <svg viewBox="0 0 20 20" width="12" height="12" aria-hidden="true">
                  <rect x="4" y="9" width="12" height="8" rx="2" fill="currentColor" />
                  <path d="M7 9V6a3 3 0 0 1 6 0v3" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
