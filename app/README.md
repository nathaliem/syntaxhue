# SyntaxHue (prototype M0)

Make a VS Code color theme in minutes: shuffle a readable base, lock the colors you like, tune by role, paste the snippet into `settings.json`.

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # engine unit tests and component tests (Vitest, Testing Library, jsdom)
npm run build
npm run lint          # oxlint, warnings fail
npm run format        # Prettier, writes changes (format:check only verifies)
npm run check         # everything CI runs: lint, format, build, test
```

- `src/engine/` — color math (OKLCH, WCAG contrast), theme generator, VS Code key derivation, export and share-link encoding
- `src/preview/` — VS Code workbench mock and a small TypeScript tokenizer
- `src/ui/` — role rail with color editor, export dialog
- `src/test/setup.ts` — shared test setup; component tests live next to the code as `*.test.tsx`

See `../REQUIREMENTS.md` for the full spec and `../concepts.html` for the concept book.

## Performance check

Dragging a slider should update the preview in under 50 ms per frame, even on a slow machine (HP-407).
`perf/drag-harness.js` measures it: build and serve the production app, show the Browser pane or window
(hidden pages get throttled animation frames), then run in the page console:

```js
await syntaxhueDrag({ role: "Keyword", slider: "Lightness", slowdown: 4 });
await syntaxhueDrag({ vibe: "Saturation", slowdown: 4 });
```

`slowdown: 4` keeps the main thread busy to imitate Chrome's 4x CPU throttling. It prints median, 95th
percentile and max frame times, split into React and style/layout work. Last measured (production build, 4x):
role sliders about 10 ms at p95, vibe sliders that recolor everything about 27 ms.

## Hosting and deploys

Hosted on Vercel (project `hueprint`, root directory `app`), connected to the GitHub repo:

- **Pull requests and other branches** get their own preview URL; Vercel comments it on the PR.
- **Pushes to `main`** deploy to production at https://syntaxhue.nathaliemaes.be (also `hueprint.nathaliemaes.be` and `hueprint-silk.vercel.app`).
- `vercel.json` sets long-lived caching for the hashed `/assets` files and basic security headers. The app keeps its state in the URL hash, so no rewrite rules are needed.
