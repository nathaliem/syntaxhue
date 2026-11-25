/**
 * Dev-only visual regression page (open /gallery.html on the dev server; it is not part of the production build).
 * Shows the curated seeds, so a generator change can be judged by eye against the same inputs every time.
 */
import { createRoot } from "react-dom/client";
import "./index.css";
import seeds from "./engine/__fixtures__/curated-seeds.json";
import { curatedTheme, type CuratedSeed } from "./engine/curated";
import { Workbench } from "./preview/Workbench";
import { DEFAULT_SAMPLE } from "./preview/samples";

const noop = () => {};

const gallery = (
  <main style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(560px, 1fr))", gap: 16 }}>
    <h1 style={{ gridColumn: "1 / -1", margin: 0 }}>Curated seeds ({seeds.length})</h1>
    {(seeds as CuratedSeed[]).map((c) => {
      const theme = curatedTheme(c);
      return (
        <figure key={`${c.harmony}-${c.mode}-${c.seed}`} style={{ margin: 0 }}>
          <figcaption style={{ font: "13px monospace", marginBottom: 4 }}>
            {theme.name} · {c.harmony} · {c.mode} · seed {c.seed}
          </figcaption>
          <div style={{ height: 340, overflow: "hidden", borderRadius: 8 }}>
            <Workbench theme={theme} selected={null} highlighted={null} onPick={noop} sample={DEFAULT_SAMPLE} />
          </div>
        </figure>
      );
    })}
  </main>
);

createRoot(document.getElementById("root")!).render(gallery);
