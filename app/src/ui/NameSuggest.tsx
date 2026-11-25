import { useMemo, useState } from "react";
import { suggestNames } from "../engine/themeName";
import type { ThemeState } from "../engine/theme";
import { Button, IconButton, Popover } from "./kit";

/** A button next to the theme name that offers names fitting the palette; "More names" draws a fresh set. */
export function NameSuggest({ theme, onPick }: { theme: ThemeState; onPick: (name: string) => void }) {
  const [round, setRound] = useState(1);
  // The list follows the palette's colors and mode, not edits to the name itself.
  const colors = ["keyword", "string", "function", "type", "constant", "variable"]
    .map((id) => theme.roles[id as keyof ThemeState["roles"]].color)
    .join();
  const names = useMemo(
    () => suggestNames(theme, round * 7919 + 13),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors, theme.mode, round],
  );
  return (
    <Popover
      label="Suggested names"
      className="menu"
      renderTrigger={({ ref, open, props }) => (
        <IconButton ref={ref} size="sm" label="Suggest names" className={open ? "on" : undefined} {...props}>
          <span aria-hidden="true">✦</span>
        </IconButton>
      )}
    >
      {(close) => (
        <>
          {names.map((n) => (
            <Button
              key={n}
              variant="ghost"
              className="menu-item"
              onClick={() => {
                close();
                onPick(n);
              }}
            >
              {n}
            </Button>
          ))}
          <Button variant="ghost" className="menu-item" onClick={() => setRound((x) => x + 1)}>
            More names
          </Button>
        </>
      )}
    </Popover>
  );
}
