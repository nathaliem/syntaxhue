import { trackEvent } from "../analytics";
import { useId, useState } from "react";
import { runPort, TARGETS, type PortTarget } from "../engine/ports";
import type { ThemeState } from "../engine/theme";
import { Button } from "./kit";

export type PortGroup = "editors" | "terminals";

const INTRO: Record<PortGroup, string> = {
  editors:
    "The same palette for other editors. Pick one, then copy the file or download it and follow the steps under it.",
  terminals:
    "The same palette for your terminal, with the 16 ANSI colors derived from your roles and contrast-checked.",
};

const inGroup = (t: PortTarget, g: PortGroup) => (g === "terminals" ? t.group === "terminal" : t.group !== "terminal");

/** Export tab for the ports (HP-1201 to HP-1207): choose a target, see where the file goes, copy or download it. */
export function PortsPanel({ theme, group }: { theme: ThemeState; group: PortGroup }) {
  const targets = TARGETS.filter((t) => inGroup(t, group));
  const [id, setId] = useState(targets[0].id);
  const target = targets.find((t) => t.id === id) ?? targets[0];
  const files = runPort(target, theme);
  const [status, setStatus] = useState("");
  const name = useId();

  const copy = async (content: string, path: string) => {
    try {
      await navigator.clipboard.writeText(content);
      trackEvent("export", { type: group === "terminals" ? "terminal" : "editor" });
      setStatus(`Copied ${path}`);
    } catch {
      setStatus("Couldn't copy. Select the text above instead.");
    }
  };

  const download = (content: string, path: string) => {
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = path.slice(path.lastIndexOf("/") + 1);
    a.click();
    URL.revokeObjectURL(url);
    trackEvent("export", { type: group === "terminals" ? "terminal" : "editor" });
    setStatus(`Downloaded ${a.download}`);
  };

  return (
    <div className="export-body">
      <p>{INTRO[group]}</p>
      <fieldset className="chips">
        <legend className="sr-only">{group === "terminals" ? "Terminal" : "Editor"}</legend>
        {targets.map((t) => (
          <label key={t.id} className={"chip" + (t.id === target.id ? " on" : "")}>
            <input
              type="radio"
              name={name}
              value={t.id}
              checked={t.id === target.id}
              onChange={() => {
                setId(t.id);
                setStatus("");
              }}
            />
            {t.label}
          </label>
        ))}
      </fieldset>
      <div>
        <b>Where it goes</b>
        <p>{target.install}</p>
      </div>
      {files.map((f) => (
        <section key={f.path} className="port-file" aria-label={f.path}>
          <code className="port-path">{f.path}</code>
          <pre className="code" tabIndex={0} aria-label={`Contents of ${f.path}`}>
            {f.content}
          </pre>
          <div className="export-actions">
            <Button variant="primary" onClick={() => download(f.content, f.path)}>
              Download {f.path.slice(f.path.lastIndexOf("/") + 1)}
            </Button>
            <Button onClick={() => void copy(f.content, f.path)}>{files.length > 1 ? `Copy ${f.path}` : "Copy"}</Button>
          </div>
        </section>
      ))}
      <p className="small" role="status">
        {status}
      </p>
    </div>
  );
}
