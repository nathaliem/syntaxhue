# Fidelity check (HP-508)

Real VS Code (1.145.2) with the exported `.vsix` of three fixture themes, next to the SyntaxHue preview.
Reproduce with `bash ci/fidelity.sh` in `app/`.

| File | Theme | Sample |
| --- | --- | --- |
| `vscode-a-typescript.jpg` | fidelity-a (seed 7, dark) | TypeScript |
| `vscode-b-typescript.jpg` | fidelity-b (seed 11, light) | TypeScript |
| `vscode-c-typescript.jpg` | fidelity-c (seed 23, dark) | TypeScript |
| `vscode-c-python.jpg` | fidelity-c | Python |

## Method
The preview's token colours were read from the page (`getComputedStyle`) and compared with colours sampled from the
VS Code screenshots, token by token, for TypeScript (themes a and c) and Python (theme c).

## Findings
- **Fixed:** the class name in `new Map()` is a type in VS Code (the TypeScript language server's semantic token
  `class`), a function in the preview (the grammar alone). The preview now applies that rule (`semanticFixes` in
  `src/preview/highlight.ts`).
- **Matched:** every other token compared, including constants (`const hue`, `MIN_CONTRAST`), parameters,
  decorators, docstrings, f-strings and call arguments in Python.
- **Not compared yet:** Rust, Go, HTML, CSS, JSON and Markdown samples, and the side-by-side pictures of the
  preview itself (only the VS Code side is stored here). The workbench chrome (activity bar, sidebar, tabs,
  status bar) was only compared by eye; the screen capture shifts colours by a few units, so exact values cannot be
  read from it.
