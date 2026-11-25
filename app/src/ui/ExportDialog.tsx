import { useState } from "react";
import { CloseIcon } from "./icons";
import { BASE_THEME, settingsSnippetText, themeFile } from "../engine/derive";
import type { ThemeState } from "../engine/theme";
import { ExtensionForm } from "./ExtensionForm";
import { PortsPanel } from "./PortsPanel";
import { SettingsGuide } from "./SettingsGuide";
import { shareUrl } from "../state";
import { Button, Dialog, IconButton, Toggle } from "./kit";

type Tab = "settings" | "file" | "extension" | "editors" | "terminals" | "link";

export function ExportDialog({ theme, open, onClose }: { theme: ThemeState; open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("settings");
  const [scoped, setScoped] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  /** After the first copy the how-to turns into the picture guide. */
  const [guided, setGuided] = useState(false);

  const snippet = settingsSnippetText(theme, scoped);
  const fileJson = JSON.stringify(themeFile(theme), null, 2);
  const link = shareUrl(theme);
  const slug =
    theme.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "theme";

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      if (what === "snippet") setGuided(true);
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
    <Dialog open={open} onClose={onClose} titleId="export-title" className="export">
      <div className="export-in">
        <div className="export-h">
          <h2 id="export-title">Export “{theme.name}”</h2>
          <IconButton size="sm" label="Close" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <div className="tabs" role="tablist">
          {(
            [
              ["settings", "Paste into settings"],
              ["file", "Theme file"],
              ["extension", "Extension (.vsix)"],
              ["editors", "Other editors"],
              ["terminals", "Terminals"],
              ["link", "Share link"],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              className={"tab" + (tab === id ? " on" : "")}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "settings" && (
          <div className="export-body">
            {guided ? (
              <SettingsGuide baseTheme={BASE_THEME[theme.mode]} />
            ) : (
              <ol className="steps">
                <li>
                  In VS Code, open the Command Palette (<kbd>⇧⌘P</kbd> / <kbd>Ctrl+Shift+P</kbd>).
                </li>
                <li>
                  Run <b>Preferences: Open User Settings (JSON)</b>.
                </li>
                <li>
                  Paste the snippet just inside the outer <code>{"{ }"}</code> and save. If a key already exists,
                  replace it.
                </li>
              </ol>
            )}
            <Toggle checked={scoped} onChange={setScoped}>
              Only apply on top of “{BASE_THEME[theme.mode]}” (recommended, keeps your other themes untouched)
            </Toggle>
            <pre className="code" tabIndex={0}>
              {snippet}
            </pre>
            <div className="export-actions">
              <Button variant="primary" onClick={() => copy(snippet, "snippet")}>
                {copied === "snippet" ? "Copied snippet" : "Copy snippet"}
              </Button>
              {copied === "failed" && <span className="small">Couldn't copy. Select the text above instead.</span>}
            </div>
          </div>
        )}

        {tab === "file" && (
          <div className="export-body">
            <p>
              A standard <code>*-color-theme.json</code> file, for packaging your own extension or sharing with someone
              who builds one.
            </p>
            <pre className="code" tabIndex={0}>
              {fileJson}
            </pre>
            <div className="export-actions">
              <Button variant="primary" onClick={download}>
                Download {slug}-color-theme.json
              </Button>
              <Button onClick={() => copy(fileJson, "file")}>{copied === "file" ? "Copied JSON" : "Copy JSON"}</Button>
            </div>
          </div>
        )}

        {tab === "extension" && <ExtensionForm theme={theme} />}

        {(tab === "editors" || tab === "terminals") && <PortsPanel key={tab} theme={theme} group={tab} />}

        {tab === "link" && (
          <div className="export-body">
            <p>
              Anyone with this link opens the same theme. Everything is stored in the link itself, nothing is uploaded.
            </p>
            <input
              className="link-in"
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Share link"
            />
            <div className="export-actions">
              <Button variant="primary" onClick={() => copy(link, "link")}>
                {copied === "link" ? "Copied link" : "Copy link"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
