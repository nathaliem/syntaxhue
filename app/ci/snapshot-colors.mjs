/**
 * Writes src/engine/__fixtures__/vscode-colors.json: every color id VS Code registers, read from an installed VS Code.
 *   VSCODE_APP="/Applications/Visual Studio Code.app" node ci/snapshot-colors.mjs
 * Ids are registered as `registerColor("id", { dark: …, light: … }, …)` in the workbench bundle (minified, so the
 * function name varies), and the git extension adds gitDecoration.* in its package.json.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const app = process.env.VSCODE_APP ?? "/Applications/Visual Studio Code.app";
const root = join(app, "Contents/Resources/app");
const bundle = readFileSync(join(root, "out/vs/workbench/workbench.desktop.main.js"), "utf8");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const git = readFileSync(join(root, "extensions/git/package.json"), "utf8");

const ids = new Set();
for (const m of bundle.matchAll(/\("([a-zA-Z]+(?:\.[a-zA-Z0-9]+)+|[a-zA-Z]+)",\{(?:dark|light|hcDark|hcLight)\s*:/g))
  ids.add(m[1]);
// registerColor("id", defaults, d(N, null)): the defaults are null, a color constant, a call or an object.
const ID = String.raw`([a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)*)`;
const DEFAULTS = String.raw`(?:null|[A-Za-z_$][\w$.]*|[A-Za-z_$][\w$.]*\((?:[^()]|\([^()]*(?:\([^()]*\)[^()]*)*\))*\)|\{(?:[^{}]|\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})*\})`;
for (const m of bundle.matchAll(new RegExp(String.raw`\("${ID}",${DEFAULTS},d\(\d+,`, "g"))) ids.add(m[1]);
// The terminal ANSI colors are registered from a table: "terminal.ansiRed":{index:1,defaults:{…
for (const m of bundle.matchAll(/"(terminal\.[A-Za-z]+)":\{index:\d+,defaults:/g)) ids.add(m[1]);
for (const m of git.matchAll(/"id":\s*"(gitDecoration\.[A-Za-z]+)"/g)) ids.add(m[1]);

writeFileSync(
  new URL("../src/engine/__fixtures__/vscode-colors.json", import.meta.url),
  JSON.stringify({ vscode: pkg.version, count: ids.size, ids: [...ids].sort() }, null, 1) + "\n",
);
process.stdout.write(`VS Code ${pkg.version}: ${ids.size} color ids\n`);
