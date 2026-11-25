import { useState } from "react";
import { trackEvent } from "../analytics";
import { mergeSettings } from "../engine/mergeSettings";
import type { ThemeState } from "../engine/theme";
import { Button } from "./kit";

/** Paste your settings.json, get it back with this theme's keys merged in (nothing else touched, no duplicate keys). */
export function MergePanel({ theme, scoped }: { theme: ThemeState; scoped: boolean }) {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState<"yes" | "failed" | null>(null);
  const result = input.trim() ? mergeSettings(input, theme, scoped) : null;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      trackEvent("export", { type: "settings" });
      setCopied("yes");
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied("failed");
    }
  };

  return (
    <details className="merge">
      <summary>Already have a settings.json? Merge instead</summary>
      <p className="small">
        Paste your whole <code>settings.json</code>. You get it back with these keys added or updated and everything
        else left alone, so nothing ends up twice. It is merged here in your browser; nothing is uploaded.
      </p>
      <textarea
        className="merge-in"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        spellCheck={false}
        placeholder={'{\n  "editor.fontSize": 14\n}'}
        aria-label="Your settings.json"
      />
      {result && !result.ok && (
        <p className="warn" role="alert">
          {result.error}
        </p>
      )}
      {result?.ok && (
        <>
          {result.notes.map((n) => (
            <p key={n} className="small" role="status">
              {n}
            </p>
          ))}
          <pre className="code" tabIndex={0} aria-label="Merged settings.json">
            {result.text}
          </pre>
          <div className="export-actions">
            <Button variant="primary" onClick={() => copy(result.text)}>
              {copied === "yes" ? "Copied merged settings" : "Copy merged settings"}
            </Button>
            {copied === "failed" && <span className="small">Couldn't copy. Select the text above instead.</span>}
          </div>
          <p className="small">Replace the whole content of your settings.json with this and save.</p>
        </>
      )}
    </details>
  );
}
