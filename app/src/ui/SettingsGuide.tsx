/**
 * Shown in place of the instruction list once the snippet is copied: three small pictures of what to do in VS Code,
 * then the two things that most often go wrong. The pictures are decoration (the captions say it all).
 */
export function SettingsGuide({ baseTheme }: { baseTheme: string }) {
  return (
    <div className="guide">
      <ol className="guide-steps">
        <li className="guide-step">
          <div className="guide-pic" aria-hidden="true">
            <div className="gp-palette">
              <span className="gp-prompt">&gt;</span> Preferences: Open User Settings (JSON)
            </div>
          </div>
          <p>
            <b>1.</b> Open the Command Palette (<kbd>⇧⌘P</kbd> or <kbd>Ctrl+Shift+P</kbd>) and run{" "}
            <b>Preferences: Open User Settings (JSON)</b>.
          </p>
        </li>
        <li className="guide-step">
          <div className="guide-pic" aria-hidden="true">
            <pre className="gp-code">
              {`{
  "editor.fontSize": 14,
  `}
              <span className="gp-paste">▮ paste here</span>
              {`
}`}
            </pre>
          </div>
          <p>
            <b>2.</b> Paste inside the outer <code>{"{ }"}</code>, after the last line.
          </p>
        </li>
        <li className="guide-step">
          <div className="guide-pic" aria-hidden="true">
            <div className="gp-tab">
              settings.json <span className="gp-dot" />
            </div>
            <div className="gp-saved">
              <kbd>⌘S</kbd> → colors change
            </div>
          </div>
          <p>
            <b>3.</b> Save with <kbd>⌘S</kbd> or <kbd>Ctrl+S</kbd>. The colors change right away.
          </p>
        </li>
      </ol>
      <div className="guide-trouble" role="note">
        <p>
          <b>Colors didn't change?</b>
        </p>
        <ul>
          <li>
            Already have <code>workbench.colorCustomizations</code>, <code>editor.tokenColorCustomizations</code> or{" "}
            <code>editor.semanticTokenColorCustomizations</code>? Replace that block, or keep only one of each. When a
            key appears twice, the last one wins and the old colors can stay.
          </li>
          <li>
            Check that “{baseTheme}” is the active theme (Command Palette → <b>Preferences: Color Theme</b>). The
            snippet sets it, but a <code>workbench.colorTheme</code> line further down the file takes over.
          </li>
        </ul>
      </div>
    </div>
  );
}
