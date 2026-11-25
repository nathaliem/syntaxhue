import { useCallback, useEffect, useRef, useState } from "react";
import { contrastIssues, ROLE_BY_ID, shuffleLabel, unlockedCount, type RoleId } from "./engine/theme";
import { FitToWidth } from "./preview/FitToWidth";
import { Workbench } from "./preview/Workbench";
import type { Lang } from "./preview/highlight";
import { sampleFor } from "./preview/samples";
import { LanguageSwitch } from "./ui/LanguageSwitch";
import { ExportDialog } from "./ui/ExportDialog";
import { LibraryDrawer } from "./ui/LibraryDrawer";
import { useLibrary } from "./ui/useLibrary";
import { themesEqual } from "./engine/library";
import { BottomSheet } from "./ui/BottomSheet";
import { RoleEditor, RoleRail } from "./ui/RoleRail";
import { useIsMobile } from "./ui/useIsMobile";
import { VibePanel } from "./ui/VibePanel";
import { useThemeStore } from "./state";
import { Button, IconButton, SegmentedControl, ToastProvider, useToast } from "./ui/kit";

function AppShell({ store }: { store: ThemeStore }) {
  const { theme, canUndo, canRedo, saveState, dispatch, notice, dismissNotice, restorePrevious } = store;
  const [selected, setSelected] = useState<RoleId | null>(null);
  const [lang, setLang] = useState<Lang>("typescript");
  const [hovered, setHovered] = useState<RoleId | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const library = useLibrary();
  const toast = useToast();
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
      if (exportOpen || libraryOpen || typing) return;
      if (isSlider && e.code === "Space") return;
      if (e.code === "Space" && !(el && el.tagName === "BUTTON")) {
        e.preventDefault();
        dispatch({ type: "shuffle" });
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void library
          .save(theme)
          .then((item) => toast.show(item ? `Saved “${theme.name}” to your library.` : "Couldn't save."));
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? "redo" : "undo" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, exportOpen, libraryOpen, library, theme, toast]);

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
          <span>SyntaxHue</span>
        </div>
        <Button onClick={() => setLibraryOpen(true)}>Library</Button>
        <label className="name">
          <span className="sr-only">Theme name</span>
          <input
            value={theme.name}
            onChange={(e) => dispatch({ type: "name", name: e.target.value.slice(0, 60) })}
            spellCheck={false}
          />
        </label>
        <span
          className={"save-state" + (saveState === "failed" ? " bad" : "")}
          role="status"
          title={
            saveState === "failed"
              ? "Your browser isn't letting us store data, so this theme will be lost when you close the tab. Use Share link to keep it."
              : "Your changes are saved in this browser."
          }
        >
          {saveState === "failed" ? "Not saved" : "Saved"}
        </span>
        {library.linked && (
          <span
            className={"save-state library-state" + (themesEqual(library.linked.theme, theme) ? "" : " dirty")}
            role="status"
            title="Whether this theme matches the copy in your library. Press ⌘S to update it."
          >
            {themesEqual(library.linked.theme, theme) ? "In library" : "Unsaved changes"}
          </span>
        )}
        <div className="bar-actions">
          <Button
            variant="primary"
            onClick={() => dispatch({ type: "shuffle" })}
            disabled={unlocked === 0}
            title={unlocked === 0 ? "Unlock a color to shuffle" : "Shuffle unlocked colors (Space)"}
          >
            {shuffleLabel(unlocked)} <kbd>Space</kbd>
          </Button>
          <SegmentedControl
            label="Theme mode"
            value={theme.mode}
            onChange={(mode) => dispatch({ type: "mode", mode })}
            segments={[
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
            ]}
          />
          <VibePanel vibe={theme.vibe} dispatch={dispatch} />
          <IconButton label="Undo" shortcut="⌘Z" onClick={() => dispatch({ type: "undo" })} disabled={!canUndo}>
            ↶
          </IconButton>
          <IconButton label="Redo" shortcut="⌘⇧Z" onClick={() => dispatch({ type: "redo" })} disabled={!canRedo}>
            ↷
          </IconButton>
          <Button className="export-btn" onClick={() => setExportOpen(true)}>
            Export
          </Button>
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
                  <span>That link doesn't contain a theme SyntaxHue can read, so your last theme is shown.</span>
                  <Button size="sm" onClick={dismissNotice}>
                    Dismiss
                  </Button>
                </>
              ) : notice.previous ? (
                <>
                  <span>You opened a shared theme. Your own theme is still saved.</span>
                  <Button size="sm" onClick={restorePrevious}>
                    Back to my theme
                  </Button>
                  <Button variant="primary" size="sm" onClick={dismissNotice}>
                    Keep this one
                  </Button>
                </>
              ) : (
                <>
                  <span>You opened a shared theme.</span>
                  <Button size="sm" onClick={dismissNotice}>
                    Dismiss
                  </Button>
                </>
              )}
            </div>
          )}
          <div className="stage-bar">
            <p className="stage-hint">Click anything in the preview to edit the color behind it.</p>
            <LanguageSwitch lang={lang} onChange={setLang} />
          </div>
          <FitToWidth>
            <Workbench theme={theme} selected={selected} highlighted={hovered} onPick={pick} sample={sampleFor(lang)} />
          </FitToWidth>
        </section>
      </div>

      {mobile && selected && (
        <BottomSheet title={ROLE_BY_ID[selected].label} onClose={() => setSelected(null)}>
          <RoleEditor key={selected} def={ROLE_BY_ID[selected]} theme={theme} dispatch={dispatch} />
        </BottomSheet>
      )}

      <LibraryDrawer
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        theme={theme}
        dispatch={dispatch}
        library={library}
      />
      <ExportDialog theme={theme} open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}

type ThemeStore = ReturnType<typeof useThemeStore>;

export default function App() {
  const store = useThemeStore();
  // The toast is drawn outside the app's own element, so it is told which chrome colors to use.
  return (
    <ToastProvider mode={store.theme.mode}>
      <AppShell store={store} />
    </ToastProvider>
  );
}
