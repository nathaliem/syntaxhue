# SyntaxHue

Make a VS Code color theme in minutes. Shuffle a readable palette, lock the colors you like, tune them by role, and
see the result in a preview that uses the same TextMate grammars as VS Code. Every text color is kept above its
contrast minimum, so the theme stays readable.

Live at <https://syntaxhue.nathaliemaes.be>. Everything runs in your browser; nothing is uploaded.

## What it does

- **Generates** themes from a few hues and chroma in the OKLCH color space, with harmonies, a dark and a light mode, and
  lock-and-shuffle.
- **Edits by role** (15 colors: background, text, accent, comments, keyword, string, function, type, variable, number,
  operator, error, warning, info, success) instead of ~800 raw workbench keys. The rest of the workbench is derived.
- **Checks contrast** (WCAG) as you edit, with a one-click lightness-only fix.
- **Previews** real code in several languages. Click anything to edit the color behind it.
- **Imports** an existing VS Code theme as a starting point, and keeps a **library** of saved themes in the browser.
- **Exports** a `settings.json` snippet, a `*-color-theme.json`, a ready-to-publish `.vsix`, and ports for Zed, Sublime
  Text, Neovim, JetBrains and common terminals.
- **Shares** a theme as a link (the theme is in the URL hash).

## Getting started

You need Node.js 24 (the version CI uses) and npm. The app lives in `app/`.

```bash
cd app
npm install
npm run dev        # http://localhost:5173
```

| Command          | What it does                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| `npm run dev`    | Start the dev server.                                                                                |
| `npm test`       | Run the unit and component tests (Vitest, Testing Library, jsdom).                                   |
| `npm run lint`   | oxlint; warnings fail the build.                                                                     |
| `npm run format` | Prettier, writes changes. `npm run format:check` only checks.                                        |
| `npm run build`  | Type-check and build for production.                                                                 |
| `npm run check`  | Everything CI runs: lint, format check, build and tests. **Run this before opening a pull request.** |

CI also builds a `.vsix` and compares it with the output of the official `@vscode/vsce` packager. To run that locally:
`npm install --global @vscode/vsce` and then `VSCE_CHECK=1 npx vitest run ci/`.

## How the code is organized

```
app/src/
  engine/    Pure TypeScript, no React. Color math (OKLCH, WCAG), theme generation, deriving VS Code keys
             from roles, versioned storage format, share links, theme import, the library store, and the
             packaging code (.vsix, zip, icon).
    ports/   One file per export target (Zed, Sublime, Neovim, JetBrains, terminals), behind a shared interface.
  preview/   The VS Code workbench mock and the Shiki-based tokenizer that colors the sample code.
  ui/        React components: role rail and editor, export dialog, library drawer, import panel.
  state.ts   The theme store: undo/redo, autosave, share-link handling.
app/ci/      Checks that need more than a unit test (comparison with vsce, color keys, fidelity fixtures).
docs/        Notes and pictures from comparing the preview with real VS Code.
```

The main idea is that a theme is **15 roles plus four vibe sliders** (`ThemeState` in `engine/theme.ts`). Everything
else, from the workbench colors to every export format, is derived from that, so a fix in the engine reaches every
output. Keep it that way: new features should start from `ThemeState`, not from VS Code's JSON.

Code comments and tests sometimes mention ticket ids such as `HP-703`. They come from the maintainer's own planning
notes, which are not part of this repository, so you can ignore them. New work is tracked in GitHub issues.

## Contributing

Contributions are welcome: bug reports, fixes, new export targets, new language samples, accessibility and
documentation improvements. For anything larger than a small fix, please open an issue first so we can agree on the
approach before you spend time on it.

### Reporting a bug

Open an issue with:

1. What you did and what you expected.
2. What happened instead, with a screenshot if it is visual.
3. For a color or export problem: the share link of the theme (Export, then Share link), your browser, and your VS Code
   version if the problem shows up there.

### Setting up and making a change

1. Fork the repository and create a branch from `main`. Name it after the change, for example
   `mode-switch-keeps-locks` or `fix-neovim-comment-style`.
2. Make your change, with tests (see below).
3. Run `npm run check` in `app/`. It must pass; CI runs the same steps.
4. Open a pull request against `main`. Describe what changed and why, link the issue, and add a screenshot or
   a short recording for anything visual.

Keep pull requests focused: one change per pull request makes review quick. Don't mix refactoring or
formatting changes into a feature.

Commit messages say what changed in plain words, for example `Library drawer: save and open themes`. Mention the issue
number when there is one.

### What we expect of a change

- **Tests live next to the code** (`foo.ts` and `foo.test.ts`). Engine code is pure functions, so it should be tested
  with plain inputs and outputs. UI is tested with Testing Library through what a user sees (roles, labels, text), not
  through implementation details. Fix a bug by first adding a test that fails.
- **Readability is the product.** Anything that colors text must keep its contrast minimum; the shared tests check this
  for generated themes and for every export port. Don't weaken those checks to make a change pass.
- **Accessible by default.** Every control is reachable with the keyboard, has an accessible name, and meets
  contrast in both light and dark chrome. Dialogs and drawers use `<dialog>`.
- **Privacy.** The app works offline and uploads nothing. Don't add network calls, trackers or analytics without
  discussing it in an issue first.
- **Few dependencies.** Prefer a small piece of code over a new package. If you do need one, say why in the pull
  request. The lock file must stay installable with `npm ci` on Linux.
- **Style.** Prettier (120 columns) and oxlint decide; `npm run format` fixes formatting. TypeScript errors on unused code. Comments
  say why, not what.
- **Saved data is versioned.** If you change the shape of `ThemeState`, bump `THEME_VERSION`, add a migration in
  `engine/schema.ts`, and add a test with a fixture of the old shape. People's saved themes must keep opening.

### Common contributions

**Add an export target.** Create a file in `app/src/engine/ports/` that implements `PortTarget` (roles and surfaces in,
files out), and register it in `ports/index.ts`. The shared tests in `ports.test.ts` then check that every role is used
and that contrast holds in the target's own mapping, so add a port-specific test file too. Say in the pull request how
you checked the output in the real application.

**Add a preview language.** Add a sample in `preview/samples.ts` and its grammar to the highlighter. Keep samples short
(about 16 to 24 lines) and make them show every role. The preview is checked against real VS Code, so note which
VS Code version you compared with.

**Change a color or scope mapping.** The `SCOPES` table in `engine/derive.ts` is read by the exporter, the preview and
the importer. Changing it changes all three, so run the whole suite and look at the preview.

**Check the preview against VS Code.** `app/ci/fidelity.sh` builds three fixture themes into a throwaway VS Code
profile so you can compare them side by side; `docs/fidelity/README.md` describes the method and what has been compared.

### Conduct

Be kind and assume good intent. Critique code and ideas, not people. A formal code of conduct and issue templates are
still to be added.

## License

[MIT](LICENSE). By contributing you agree that your contribution is released under the same license.
