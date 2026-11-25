import { MoreIcon } from "../icons";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { Popover } from "./Popover";

export interface MenuItem {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  /** Shown after the label, e.g. "⌘Z". */
  shortcut?: string;
}

interface Props {
  /** Names the button and the panel, e.g. "More actions". */
  label: string;
  items: MenuItem[];
}

/** A "⋯" button that opens a short list of actions, for the ones there is no room for in the top bar. */
export function Menu({ label, items }: Props) {
  return (
    <Popover
      label={label}
      className="menu"
      renderTrigger={({ ref, props }) => (
        <IconButton ref={ref} label={label} {...props}>
          <MoreIcon />
        </IconButton>
      )}
    >
      {(close) =>
        items.map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            className="menu-item"
            disabled={item.disabled}
            onClick={() => {
              close();
              item.onSelect();
            }}
          >
            <span>{item.label}</span>
            {item.shortcut && <kbd>{item.shortcut}</kbd>}
          </Button>
        ))
      }
    </Popover>
  );
}
