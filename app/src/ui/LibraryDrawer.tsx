import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "./icons";
import { themesEqual, type SavedTheme } from "../engine/library";
import type { ThemeState } from "../engine/theme";
import type { Action } from "../state";
import { ago } from "./ago";
import { ImportPanel } from "./ImportPanel";
import type { Library } from "./useLibrary";
import { Button, Drawer, IconButton, useToast } from "./kit";

const STRIP = ["keyword", "string", "function", "type", "constant", "accent"] as const;

function Strip({ theme }: { theme: ThemeState }) {
  return (
    <span className="strip" style={{ background: theme.roles.bg.color }} aria-hidden="true">
      {STRIP.map((r) => (
        <i key={r} style={{ background: theme.roles[r].color }} />
      ))}
    </span>
  );
}

/** "Your themes": save the current theme, open a saved one, or start from an imported theme. */
export function LibraryDrawer({
  open,
  onClose,
  theme,
  dispatch,
  library,
}: {
  open: boolean;
  onClose: () => void;
  theme: ThemeState;
  dispatch: (a: Action) => void;
  library: Library;
}) {
  const [saved, setSaved] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  /** The rename in progress, readable from handlers that fire after it ended (blur after Enter or Escape). */
  const renamingNow = useRef<{ id: string; name: string } | null>(null);
  const { refresh } = library;
  const toast = useToast();

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const close = () => {
    setSaved(null);
    startRename(null);
    onClose();
  };

  const { linked } = library;
  const unchanged = linked ? themesEqual(linked.theme, theme) : false;

  const save = async (how: "update" | "new") => {
    const item = await library.save(theme, how);
    setSaved(item ? `Saved “${theme.name}”.` : null);
  };

  const startRename = (r: { id: string; name: string } | null) => {
    renamingNow.current = r;
    setRenaming(r);
  };

  const commitRename = async () => {
    const current = renamingNow.current;
    if (!current) return; // already committed or cancelled
    const { id, name } = current;
    startRename(null);
    const item = library.items.find((i) => i.id === id);
    if (!item || !name.trim() || name.trim() === item.theme.name) return;
    if (await library.rename(id, name)) {
      // The editor shows the same theme: keep its name in step so it doesn't read as "Unsaved changes".
      if (library.linked?.id === id && theme.name === item.theme.name) dispatch({ type: "name", name: name.trim() });
      setSaved(`Renamed to “${name.trim()}”.`);
    }
  };

  const duplicate = async (item: SavedTheme) => {
    const copy = await library.duplicate(item.id);
    if (copy) setSaved(`Added “${copy.theme.name}”.`);
  };

  const remove = async (item: SavedTheme) => {
    const gone = await library.remove(item.id);
    if (!gone) return;
    setSaved(null);
    toast.show(`Deleted “${gone.theme.name}”.`, { undo: () => void library.restore(gone) });
  };

  const openItem = (item: SavedTheme) => {
    library.open(item);
    dispatch({ type: "load", theme: item.theme });
    onClose();
  };

  return (
    <Drawer open={open} onClose={close} titleId="library-title">
      <div className="drawer-in">
        <div className="export-h">
          <h2 id="library-title">Your themes</h2>
          <IconButton size="sm" label="Close" onClick={close}>
            <CloseIcon />
          </IconButton>
        </div>

        {linked ? (
          <div className="save-row">
            <Button variant="primary" onClick={() => void save("update")} disabled={unchanged}>
              Update “{linked.theme.name}”
            </Button>
            <Button onClick={() => void save("new")}>Save as new</Button>
          </div>
        ) : (
          <Button variant="primary" onClick={() => void save("new")}>
            Save current
          </Button>
        )}
        {saved && (
          <p className="small" role="status">
            {saved}
          </p>
        )}
        {library.loaded && !library.persistent && (
          <p className="field-msg bad" role="note">
            Your browser isn't letting us store data, so themes will disappear when you close this tab. Use Share link
            to keep one.
          </p>
        )}
        {library.error && (
          <p className="field-msg bad" role="alert">
            {library.error}
          </p>
        )}

        {library.loaded && library.items.length === 0 ? (
          <p className="small">No saved themes yet. Save the current one to start your library.</p>
        ) : (
          <ul className="saved" aria-label="Saved themes">
            {library.items.map((item) => (
              <li key={item.id}>
                {renaming?.id === item.id ? (
                  <form
                    className="saved-row"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void commitRename();
                    }}
                  >
                    <Strip theme={item.theme} />
                    <input
                      autoFocus
                      aria-label={`New name for ${item.theme.name}`}
                      value={renaming.name}
                      maxLength={60}
                      onChange={(e) => startRename({ id: item.id, name: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          e.preventDefault(); // cancel the rename, not the whole drawer
                          e.stopPropagation();
                          startRename(null);
                        }
                      }}
                      onBlur={() => void commitRename()}
                    />
                  </form>
                ) : (
                  <div className="saved-row">
                    <button className="open" onClick={() => openItem(item)} aria-label={`Open ${item.theme.name}`}>
                      <Strip theme={item.theme} />
                      <span className="saved-name">{item.theme.name}</span>
                      <span className="small">
                        {item.theme.mode} · edited {ago(item.savedAt)}
                      </span>
                    </button>
                    <span className="saved-actions">
                      <Button
                        size="sm"
                        onClick={() => startRename({ id: item.id, name: item.theme.name })}
                        aria-label={`Rename ${item.theme.name}`}
                      >
                        Rename
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => void duplicate(item)}
                        aria-label={`Duplicate ${item.theme.name}`}
                      >
                        Duplicate
                      </Button>
                      <Button size="sm" onClick={() => void remove(item)} aria-label={`Delete ${item.theme.name}`}>
                        Delete
                      </Button>
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <ImportPanel theme={theme} dispatch={dispatch} />
      </div>
    </Drawer>
  );
}
