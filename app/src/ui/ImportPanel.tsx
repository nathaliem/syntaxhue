import { useId, useState, type DragEvent } from "react";
import { fixAllContrast, importTheme, type ImportFile } from "../engine/importTheme";
import { contrastIssues, type ThemeState } from "../engine/theme";
import type { Action } from "../state";
import { Button } from "./kit";

function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

type Result = { ok: true; name: string; notes: string[] } | { ok: false; error: string };

/** Start from a theme you already use: pick, drop or paste a VS Code theme file. Nothing leaves the browser. */
export function ImportPanel({ theme, dispatch }: { theme: ThemeState; dispatch: (a: Action) => void }) {
  const [result, setResult] = useState<Result | null>(null);
  const [pasted, setPasted] = useState("");
  const [over, setOver] = useState(false);
  const id = useId();

  const run = (files: ImportFile[]) => {
    const out = importTheme(files);
    if (!out.ok) return setResult(out);
    dispatch({ type: "load", theme: out.theme });
    setResult({ ok: true, name: out.theme.name, notes: out.notes });
  };

  const fromFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    try {
      run(await Promise.all([...list].map(async (f) => ({ name: f.name, text: await readText(f) }))));
    } catch {
      setResult({ ok: false, error: "That file couldn't be read." });
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    void fromFiles(e.dataTransfer.files);
  };

  const issues = result?.ok ? contrastIssues(theme) : [];

  return (
    <section className="import" aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`}>Start from an existing theme</h3>
      <label
        className={"drop" + (over ? " over" : "")}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <span>
          <b>Choose a theme file</b> or drop it here
        </span>
        <span className="small">
          A VS Code color theme <code>.json</code>, or a <code>settings.json</code> with color customizations. Select a
          theme and the file it includes together to import both.
        </span>
        <input
          type="file"
          multiple
          accept=".json,.jsonc,application/json"
          onChange={(e) => {
            void fromFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      <details>
        <summary>Paste JSON instead</summary>
        <textarea
          aria-label="Theme JSON"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          spellCheck={false}
          rows={5}
        />
        <Button size="sm" disabled={!pasted.trim()} onClick={() => run([{ name: "pasted theme", text: pasted }])}>
          Import pasted theme
        </Button>
      </details>

      {result && !result.ok && (
        <p className="field-msg bad" role="alert">
          {result.error}
        </p>
      )}
      {result?.ok && (
        <div className="import-result" role="status">
          <b>Imported “{result.name}”.</b> It is open in the editor now; undo brings back your previous theme.
          {issues.length > 0 && (
            <p>
              {issues.length} color{issues.length > 1 ? "s are" : " is"} below the readable minimum.{" "}
              <Button size="sm" onClick={() => dispatch({ type: "load", theme: fixAllContrast(theme) })}>
                Fix contrast
              </Button>
            </p>
          )}
          <ul>
            {result.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
