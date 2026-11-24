/**
 * Checks that every workbench color id we write exists in a real VS Code. Needs an installed VS Code, so it only runs
 * with VSCODE_APP set, for example:
 *   VSCODE_APP="/Applications/Visual Studio Code.app" npx vitest run ci/colorkeys.test.ts
 * Color ids are registered in the workbench bundle, and the git extension adds gitDecoration.* in its package.json.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { workbenchColors } from "../src/engine/derive";
import { generate } from "../src/engine/theme";

const app = process.env.VSCODE_APP;

describe.skipIf(!app)("color ids exist in VS Code", () => {
  it("knows every key we write", () => {
    const root = join(app!, "Contents/Resources/app");
    const bundle = readFileSync(join(root, "out/vs/workbench/workbench.desktop.main.js"), "utf8");
    const git = readFileSync(join(root, "extensions/git/package.json"), "utf8");
    const keys = Object.keys(workbenchColors(generate(7, "dark")));
    const unknown = keys.filter((k) => !bundle.includes(`"${k}"`) && !git.includes(`"${k}"`));
    expect(unknown).toEqual([]);
  });
});
