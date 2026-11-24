/**
 * Compares our browser-built .vsix with what the official packager makes from the same files.
 * Only runs when VSCE_CHECK=1 (the CI job installs @vscode/vsce first), so `npm test` stays offline.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { extensionFiles, type ExtensionOptions } from "../src/engine/extension";
import { iconPng } from "../src/engine/icon";
import { generate } from "../src/engine/theme";
import { buildVsix } from "../src/engine/vsix";
import { unzipStore } from "../src/engine/zip";

const options: ExtensionOptions = {
  publisher: "hueprint-ci",
  version: "1.0.0",
  description: "Fixture theme used to check the package.",
  license: "MIT",
  author: "Hueprint CI",
  year: 2026,
  repository: "https://github.com/hueprint/fixture",
};
const theme = { ...generate(7, "dark"), name: "CI Fixture" };

describe.skipIf(!process.env.VSCE_CHECK)("package matches the official packager", () => {
  const assets = { icon: iconPng(theme) };
  let official: Record<string, Uint8Array>;
  let ours: Record<string, Uint8Array>;

  beforeAll(() => {
    const dir = mkdtempSync(join(tmpdir(), "hueprint-vsce-"));
    for (const [path, content] of Object.entries(extensionFiles(theme, options, assets))) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), content);
    }
    const out = join(dir, "official.vsix");
    execFileSync("vsce", ["package", "--out", out, "--allow-missing-repository"], { cwd: dir, stdio: "pipe" });
    official = unzipStore(new Uint8Array(readFileSync(out)));
    ours = unzipStore(buildVsix(theme, options, assets));
  });
  const text = (b: Uint8Array) => new TextDecoder().decode(b);

  it("contains the same files", () => {
    expect(Object.keys(ours).sort()).toEqual(Object.keys(official).sort());
  });

  it("has byte-identical extension files", () => {
    for (const name of Object.keys(official).filter((n) => n.startsWith("extension/"))) {
      expect(text(ours[name]), name).toBe(text(official[name]));
    }
  });

  it("declares the same identity in the manifest", () => {
    const id = (m: string) => /<Identity [^>]*>/.exec(m)?.[0];
    expect(id(text(ours["extension.vsixmanifest"]))).toBe(id(text(official["extension.vsixmanifest"])));
  });
});
