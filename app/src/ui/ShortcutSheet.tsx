import { Dialog, IconButton } from "./kit";
import { CloseIcon } from "./icons";

const MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = MAC ? "⌘" : "Ctrl";

const SHORTCUTS: { keys: string[]; action: string }[] = [
  { keys: ["Space"], action: "Shuffle unlocked colors" },
  { keys: ["L"], action: "Lock or unlock the open color" },
  { keys: [MOD, "Z"], action: "Undo" },
  { keys: [MOD, "Shift", "Z"], action: "Redo" },
  { keys: [MOD, "E"], action: "Export" },
  { keys: [MOD, "S"], action: "Save to library" },
  { keys: ["?"], action: "Show this list" },
  { keys: ["Esc"], action: "Close a panel or dialog" },
];

/** The keyboard shortcuts, opened with "?". */
export function ShortcutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} titleId="shortcuts-title" className="shortcuts">
      <div className="export-in">
        <div className="export-h">
          <h2 id="shortcuts-title">Keyboard shortcuts</h2>
          <IconButton size="sm" label="Close" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <dl className="shortcut-list">
          {SHORTCUTS.map((s) => (
            <div key={s.action} className="shortcut-row">
              <dt>{s.action}</dt>
              <dd>
                {s.keys.map((k) => (
                  <kbd key={k}>{k}</kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
        <p className="shortcut-note">Shortcuts pause while you type in a field.</p>
      </div>
    </Dialog>
  );
}
