import { useEffect, useRef, useState } from "react";
import { BASE_THEME, settingsSnippetText, themeFile } from "../engine/derive";
import type { ThemeState } from "../engine/theme";
import { shareUrl } from "../state";

type Tab = "settings" | "file" | "link";

export function ExportDialog({ theme, open, onClose }: { theme: ThemeState; open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<Tab>("settings");
  const [scoped, setScoped] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const snippet = settingsSnippetText(theme, scoped);
  const fileJson = JSON.stringify(themeFile(theme), null, 2);
  const link = shareUrl(theme);
  const slug = theme.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "theme";

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied("failed");
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([fileJson], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-color-theme.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <dialog ref={ref} className="export" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-labelledby="export-title">
      <div className="export-in">
        <header className="export-h">
          <h2 id="export-title">Export “{theme.name}”</h2>
          <button className="btn sm icon" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className="tabs" role="tablist">
          {([["settings", "Paste into settings"], ["file", "Theme file"], ["link", "Share link"]] as [Tab, string][]).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={"tab" + (tab === id ? " on" : "")} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        {tab === "settings" && (
          <div className="export-body">
            <ol className="steps">
              <li>In VS Code, open the Command Palette (<kbd>⇧⌘P</kbd> / <kbd>Ctrl+Shift+P</kbd>).</li>
              <li>Run <b>Preferences: Open User Settings (JSON)</b>.</li>
              <li>Paste the snippet just inside the outer <code>{"{ }"}</code> and save. If a key already exists, replace it.</li>
            </ol>
            <label className="check">
              <input type="checkbox" checked={scoped} onChange={(e) => setScoped(e.target.checked)} />
              Only apply on top of “{BASE_THEME[theme.mode]}” (recommended, keeps your other themes untouched)
            </label>
            <pre className="code" tabIndex={0}>{snippet}</pre>
            <div className="export-actions">
              <button className="btn primary" onClick={() => copy(snippet, "snippet")}>{copied === "snippet" ? "Copied snippet" : "Copy snippet"}</button>
              {copied === "failed" && <span className="small">Couldn't copy. Select the text above instead.</span>}
            </div>
          </div>
        )}

        {tab === "file" && (
          <div className="export-body">
            <p>A standard <code>*-color-theme.json</code> file, for packaging your own extension or sharing with someone who builds one.</p>
            <pre className="code" tabIndex={0}>{fileJson}</pre>
            <div className="export-actions">
              <button className="btn primary" onClick={download}>Download {slug}-color-theme.json</button>
              <button className="btn" onClick={() => copy(fileJson, "file")}>{copied === "file" ? "Copied JSON" : "Copy JSON"}</button>
            </div>
          </div>
        )}

        {tab === "link" && (
          <div className="export-body">
            <p>Anyone with this link opens the same theme. Everything is stored in the link itself, nothing is uploaded.</p>
            <input className="link-in" readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Share link" />
            <div className="export-actions">
              <button className="btn primary" onClick={() => copy(link, "link")}>{copied === "link" ? "Copied link" : "Copy link"}</button>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
