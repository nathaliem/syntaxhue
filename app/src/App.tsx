import { useCallback, useEffect, useRef, useState } from "react";
import { contrastIssues, ROLE_BY_ID, shuffleLabel, unlockedCount, type RoleId } from "./engine/theme";
import { FitToWidth } from "./preview/FitToWidth";
import { Workbench } from "./preview/Workbench";
import { ExportDialog } from "./ui/ExportDialog";
import { BottomSheet } from "./ui/BottomSheet";
import { RoleEditor, RoleRail } from "./ui/RoleRail";
import { useIsMobile } from "./ui/useIsMobile";
import { VibePanel } from "./ui/VibePanel";
import { useThemeStore } from "./state";

export default function App() {
  const { theme, canUndo, canRedo, dispatch, notice, dismissNotice, restorePrevious } = useThemeStore();
  const [selected, setSelected] = useState<RoleId | null>(null);
  const [hovered, setHovered] = useState<RoleId | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const issues = contrastIssues(theme);

  // A short message from the role rail (copy, paste) that temporarily replaces the contrast summary.
  const [status, setStatus] = useState<string | null>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const showStatus = useCallback((message: string) => {
    setStatus(message);
    clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(null), 2500);
  }, []);
  useEffect(() => () => clearTimeout(statusTimer.current), []);
  const unlocked = unlockedCount(theme);

  // A button clicked with the mouse shouldn't keep focus, or Space would press it again
  // (e.g. unlock the color you just locked) instead of shuffling. Keyboard focus is untouched.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.detail === 0) return; // keyboard-triggered click
      const b = (e.target as HTMLElement).closest("button");
      if (b && !b.closest("dialog")) b.blur();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Keyboard: Space shuffles, ⌘Z / ⌘⇧Z undo/redo — unless typing in a field or a dialog is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const isSlider = el instanceof HTMLInputElement && el.type === "range";
      const typing = el && !isSlider && (/INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable);
      if (exportOpen || typing) return;
      if (isSlider && e.code === "Space") return;
      if (e.code === "Space" && !(el && el.tagName === "BUTTON")) {
        e.preventDefault();
        dispatch({ type: "shuffle" });
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? "redo" : "undo" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, exportOpen]);

  const mobile = useIsMobile();
  const pick = (id: RoleId) => {
    setSelected(id);
    if (mobile) return;
    requestAnimationFrame(() =>
      document.getElementById(`edit-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }),
    );
  };

  return (
    <div className="app" data-mode={theme.mode}>
      <header className="bar">
        <div className="brand">
          <img src="/favicon.svg" alt="" width="28" height="28" />
          <span>Hueprint</span>
        </div>
        <label className="name">
          <span className="sr-only">Theme name</span>
          <input
            value={theme.name}
            onChange={(e) => dispatch({ type: "name", name: e.target.value.slice(0, 60) })}
            spellCheck={false}
          />
        </label>
        <div className="bar-actions">
          <button
            className="btn primary"
            onClick={() => dispatch({ type: "shuffle" })}
            disabled={unlocked === 0}
            title={unlocked === 0 ? "Unlock a color to shuffle" : "Shuffle unlocked colors (Space)"}
          >
            {shuffleLabel(unlocked)} <kbd>Space</kbd>
          </button>
          <div className="seg" role="group" aria-label="Theme mode">
            <button aria-pressed={theme.mode === "dark"} onClick={() => dispatch({ type: "mode", mode: "dark" })}>
              Dark
            </button>
            <button aria-pressed={theme.mode === "light"} onClick={() => dispatch({ type: "mode", mode: "light" })}>
              Light
            </button>
          </div>
          <VibePanel vibe={theme.vibe} dispatch={dispatch} />
          <button
            className="btn icon"
            onClick={() => dispatch({ type: "undo" })}
            disabled={!canUndo}
            aria-label="Undo"
            title="Undo (⌘Z)"
          >
            ↶
          </button>
          <button
            className="btn icon"
            onClick={() => dispatch({ type: "redo" })}
            disabled={!canRedo}
            aria-label="Redo"
            title="Redo (⌘⇧Z)"
          >
            ↷
          </button>
          <button className="btn export-btn" onClick={() => setExportOpen(true)}>
            Export
          </button>
        </div>
      </header>

      <div className={"layout" + (mobile && selected ? " sheet-open" : "")}>
        <aside className="side" aria-label="Theme colors">
          <RoleRail
            theme={theme}
            selected={selected}
            onSelect={setSelected}
            onHover={setHovered}
            dispatch={dispatch}
            onStatus={showStatus}
            inlineEditor={!mobile}
          />
          <p className="side-foot" role="status">
            {status ??
              (issues.length === 0
                ? "All colors pass contrast checks."
                : `${issues.length} color${issues.length > 1 ? "s" : ""} below the readable minimum.`)}
          </p>
          <p className="side-foot support">
            Free and made by one person.{" "}
            <a href="https://buymeacoffee.com/nathaliemaes" target="_blank" rel="noopener noreferrer">
              Buy me a coffee ☕
            </a>
          </p>
        </aside>
        <section className="stage" aria-label="Preview">
          {notice && (
            <div className="notice" role="status">
              {notice.kind === "badLink" ? (
                <>
                  <span>That link doesn't contain a theme Hueprint can read, so your last theme is shown.</span>
                  <button className="btn sm" onClick={dismissNotice}>
                    Dismiss
                  </button>
                </>
              ) : notice.previous ? (
                <>
                  <span>You opened a shared theme. Your own theme is still saved.</span>
                  <button className="btn sm" onClick={restorePrevious}>
                    Back to my theme
                  </button>
                  <button className="btn sm primary" onClick={dismissNotice}>
                    Keep this one
                  </button>
                </>
              ) : (
                <>
                  <span>You opened a shared theme.</span>
                  <button className="btn sm" onClick={dismissNotice}>
                    Dismiss
                  </button>
                </>
              )}
            </div>
          )}
          <p className="stage-hint">Click anything in the preview to edit the color behind it.</p>
          <FitToWidth>
            <Workbench theme={theme} selected={selected} highlighted={hovered} onPick={pick} />
          </FitToWidth>
        </section>
      </div>

      {mobile && selected && (
        <BottomSheet title={ROLE_BY_ID[selected].label} onClose={() => setSelected(null)}>
          <RoleEditor key={selected} def={ROLE_BY_ID[selected]} theme={theme} dispatch={dispatch} />
        </BottomSheet>
      )}

      <ExportDialog theme={theme} open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}
