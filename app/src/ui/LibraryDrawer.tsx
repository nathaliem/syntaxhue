import { useEffect, useRef, useState } from "react";
import type { SavedTheme } from "../engine/library";
import type { ThemeState } from "../engine/theme";
import type { Action } from "../state";
import { ago } from "./ago";
import { ImportPanel } from "./ImportPanel";
import type { Library } from "./useLibrary";

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
  const ref = useRef<HTMLDialogElement>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const { refresh } = library;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const close = () => {
    setSaved(null);
    onClose();
  };

  const save = async () => {
    setSaved((await library.save(theme)) ? `Saved “${theme.name}”.` : null);
  };

  const openItem = (item: SavedTheme) => {
    dispatch({ type: "load", theme: item.theme });
    onClose();
  };

  return (
    <dialog
      ref={ref}
      className="drawer"
      onClose={close}
      onClick={(e) => e.target === ref.current && close()}
      aria-labelledby="library-title"
    >
      <div className="drawer-in">
        <header className="export-h">
          <h2 id="library-title">Your themes</h2>
          <button className="btn sm icon" onClick={close} aria-label="Close">
            ✕
          </button>
        </header>

        <button className="btn primary" onClick={() => void save()}>
          Save current
        </button>
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
                <button onClick={() => openItem(item)} aria-label={`Open ${item.theme.name}`}>
                  <Strip theme={item.theme} />
                  <span className="saved-name">{item.theme.name}</span>
                  <span className="small">
                    {item.theme.mode} · edited {ago(item.savedAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <ImportPanel theme={theme} dispatch={dispatch} />
      </div>
    </dialog>
  );
}
