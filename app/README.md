# Hueprint (prototype M0)

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
