import { useId, useMemo, useState, type ReactNode } from "react";
import {
  advice,
  fieldProblems,
  LICENSES,
  parseKeywords,
  screenshotsUsable,
  slugify,
  type ExtensionAssets,
  type ExtensionOptions,
  type Field,
  type LicenseId,
} from "../engine/extension";
import type { ThemeState } from "../engine/theme";
import { publishGuide } from "../engine/publishGuide";
import { iconPng } from "../engine/icon";
import { allScreenshots } from "../preview/screenshot";
import { buildVsix, vsixFileName } from "../engine/vsix";

const KEY = "hueprint.extension";
const YEAR = new Date().getFullYear();

/** What is remembered between visits: who you are, not what this theme is called. */
interface Saved {
  publisher: string;
  author: string;
  license: LicenseId;
  repository: string;
  keywords: string;
}
const EMPTY: Saved = { publisher: "", author: "", license: "MIT", repository: "", keywords: "" };

function load(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (!raw || typeof raw !== "object") return EMPTY;
    const text = (v: unknown) => (typeof v === "string" ? v.slice(0, 300) : "");
    return {
      publisher: text(raw.publisher),
      author: text(raw.author),
      license: LICENSES.includes(raw.license) ? raw.license : "MIT",
      repository: text(raw.repository),
      keywords: text(raw.keywords),
    };
  } catch {
    return EMPTY;
  }
}

/** The Extension (.vsix) tab: the details the Marketplace needs, checked as you type. */
export function ExtensionForm({ theme }: { theme: ThemeState }) {
  const [saved, setSaved] = useState<Saved>(load);
  // Per-theme fields follow the theme until they are edited; null means "use the suggestion".
  const [over, setOver] = useState<{ displayName: string | null; id: string | null; description: string | null }>({
    displayName: null,
    id: null,
    description: null,
  });
  const [version, setVersion] = useState("1.0.0");
  const [shots, setShots] = useState(false);
  const [pair, setPair] = useState(false);
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const icon = useMemo(() => iconPng(theme), [theme]);
  const iconUrl = useMemo(() => "data:image/png;base64," + toBase64(icon), [icon]);

  const suggested = {
    displayName: theme.name,
    id: slugify(theme.name),
    description: `${theme.name}: a ${theme.mode} color theme made with Hueprint.`,
  };
  const value = {
    displayName: over.displayName ?? suggested.displayName,
    id: over.id ?? suggested.id,
    description: over.description ?? suggested.description,
  };

  const options: ExtensionOptions = {
    publisher: saved.publisher.trim(),
    id: value.id.trim(),
    displayName: value.displayName.trim(),
    version: version.trim(),
    description: value.description.trim(),
    license: saved.license,
    author: saved.author.trim() || saved.publisher.trim(),
    year: YEAR,
    keywords: parseKeywords(saved.keywords),
    repository: saved.repository.trim() || undefined,
    pair,
  };
  const problems = fieldProblems(theme, options);
  const tips = advice(options);
  const ready = Object.keys(problems).length === 0;

  const update = (next: Partial<Saved>) => setSaved((s) => ({ ...s, ...next }));
  // The license name falls back to the publisher id, so don't report it twice while that is still empty.
  const problem = (f: Field) => (f === "author" && !options.publisher ? undefined : problems[f]);

  const usable = screenshotsUsable(options.repository);

  const download = async () => {
    if (!ready || building) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(saved));
    } catch {
      /* private mode: details just won't be remembered */
    }
    setBuildError(null);
    setBuilding(true);
    try {
      const assets: ExtensionAssets = { icon };
      if (shots && usable) assets.screenshots = await allScreenshots(theme);
      const url = URL.createObjectURL(
        new Blob([buildVsix(theme, options, assets) as BlobPart], { type: "application/zip" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = vsixFileName(theme, options);
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setBuildError(e instanceof Error ? e.message : "Something went wrong while building the package.");
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="export-body">
      <p>
        A ready-to-install extension. Install it with <b>Extensions › ⋯ › Install from VSIX…</b> in VS Code, or publish
        it to the Marketplace. It is built right here; nothing is uploaded.
      </p>
      <div className="field-grid">
        <TextField
          label="Name"
          value={value.displayName}
          onChange={(v) => setOver((o) => ({ ...o, displayName: v }))}
          problem={problem("displayName")}
          hint="Shown in the Marketplace and the extensions list."
        />
        <TextField
          label="Extension id"
          value={value.id}
          onChange={(v) => setOver((o) => ({ ...o, id: v }))}
          problem={problem("id")}
          hint={`Lowercase letters, digits and hyphens. Installs as ${options.publisher || "publisher"}.${value.id || "id"}.`}
        />
        <TextField
          label="Publisher id"
          value={saved.publisher}
          onChange={(v) => update({ publisher: v })}
          placeholder="your-publisher-id"
          problem={problem("publisher")}
          hint="The id of your publisher on marketplace.visualstudio.com. Any lowercase id works for a local install."
        />
        <TextField
          label="Version"
          value={version}
          onChange={setVersion}
          problem={problem("version")}
          hint="Raise it each time you publish an update."
          narrow
        />
        <TextField
          label="Description"
          value={value.description}
          onChange={(v) => setOver((o) => ({ ...o, description: v }))}
          problem={problem("description")}
          hint="One line, shown under the name in search results."
        />
        <TextField
          label="Name in the license"
          value={saved.author}
          onChange={(v) => update({ author: v })}
          placeholder={saved.publisher || "Your name"}
          problem={problem("author")}
          hint="Defaults to the publisher id."
        />
        <Shell label="License" hint="Written to the LICENSE file." narrow>
          {(p) => (
            <select {...p} value={saved.license} onChange={(e) => update({ license: e.target.value as LicenseId })}>
              {LICENSES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          )}
        </Shell>
        <TextField
          label="Repository (optional)"
          value={saved.repository}
          onChange={(v) => update({ repository: v })}
          placeholder="https://github.com/you/your-theme"
          problem={problem("repository")}
          hint="Linked from the Marketplace page."
        />
        <TextField
          label="Keywords (optional)"
          value={saved.keywords}
          onChange={(v) => update({ keywords: v })}
          placeholder="green, calm"
          hint="Comma separated. “theme”, “color-theme” and the mode are added for you."
        />
      </div>
      <div className="icon-row">
        <img src={iconUrl} width={64} height={64} alt="Icon preview" />
        <div>
          <b>Icon</b>
          <p className="small">
            Made from your palette, 128 × 128 px, as the Marketplace asks. It goes into the package automatically.
          </p>
        </div>
      </div>
      <label className="check">
        <input type="checkbox" checked={pair} onChange={(e) => setPair(e.target.checked)} />
        Also include the {theme.mode === "dark" ? "light" : "dark"} version
      </label>
      <p className="small">
        Same hues and chroma, with lightness re-solved so every text color still meets its contrast minimum.
      </p>
      <label className="check">
        <input
          type="checkbox"
          checked={shots && usable}
          disabled={!usable}
          onChange={(e) => setShots(e.target.checked)}
        />
        Add a screenshot per language to the README
      </label>
      <p className="small">
        {usable
          ? "Commit the package's images folder to your repository too: the Marketplace loads the pictures from there."
          : "Needs a GitHub or GitLab repository above. The Marketplace loads README pictures from the repository, not from the package."}
      </p>
      {tips.length > 0 && ready && (
        <ul className="tips" aria-label="Suggestions">
          {tips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
      <div className="export-actions">
        <button className="btn primary" onClick={() => void download()} disabled={!ready || building}>
          {building ? "Building…" : `Download ${vsixFileName(theme, options)}`}
        </button>
        {buildError && (
          <span className="small field-msg bad" role="alert">
            {buildError}
          </span>
        )}
        {!ready && <span className="small">Fix the highlighted fields to download.</span>}
        {(over.displayName !== null || over.id !== null || over.description !== null) && (
          <button className="btn" onClick={() => setOver({ displayName: null, id: null, description: null })}>
            Use suggested name, id and description
          </button>
        )}
      </div>
      <PublishGuide theme={theme} options={options} />
    </div>
  );
}

function PublishGuide({ theme, options }: { theme: ThemeState; options: ExtensionOptions }) {
  const { steps, failures } = publishGuide(theme, options);
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (c: string) => {
    try {
      await navigator.clipboard.writeText(c);
      setCopied(c);
    } catch {
      setCopied(null);
    }
  };
  return (
    <details className="guide">
      <summary>How to publish it</summary>
      <ol>
        {steps.map((st) => (
          <li key={st.title}>
            <b>{st.title}</b>
            <p className="small">{st.body}</p>
            {st.commands?.map((c) => (
              <div className="cmd" key={c}>
                <code>{c}</code>
                <button className="btn sm" onClick={() => void copy(c)} aria-label={`Copy ${c}`}>
                  {copied === c ? "Copied" : "Copy"}
                </button>
              </div>
            ))}
            {st.link && (
              <a href={st.link.href} target="_blank" rel="noopener noreferrer" className="small">
                {st.link.label} ↗
              </a>
            )}
          </li>
        ))}
      </ol>
      <b>If something goes wrong</b>
      <dl className="failures">
        {failures.map((f) => (
          <div key={f.problem}>
            <dt>{f.problem}</dt>
            <dd className="small">{f.fix}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

interface ControlProps {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby": string;
}

/** Label, control and a line of help that turns into the error message when there is one. */
function Shell({
  label,
  hint,
  problem,
  narrow,
  children,
}: {
  label: string;
  hint?: string;
  problem?: string;
  narrow?: boolean;
  children: (props: ControlProps) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={"field" + (narrow ? " narrow" : "")}>
      <label htmlFor={id}>{label}</label>
      {children({ id, "aria-invalid": !!problem, "aria-describedby": `${id}-msg` })}
      <span className={"field-msg" + (problem ? " bad" : "")} id={`${id}-msg`}>
        {problem ?? hint ?? ""}
      </span>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  problem,
  narrow,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  problem?: string;
  narrow?: boolean;
}) {
  return (
    <Shell label={label} hint={hint} problem={problem} narrow={narrow}>
      {(p) => (
        <input
          {...p}
          value={value}
          placeholder={placeholder}
          spellCheck={false}
          autoCapitalize="none"
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Shell>
  );
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
