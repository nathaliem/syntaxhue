/**
 * Compares our browser-built .vsix with what the official packager makes from the same files.
 * Only runs when VSCE_CHECK=1 (the CI job installs @vscode/vsce first), so `npm test` stays offline.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { inflateRawSync } from "node:zlib";
import { dirname, join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { extensionFiles, type ExtensionOptions } from "../src/engine/extension";
import { iconPng } from "../src/engine/icon";
import { generate } from "../src/engine/theme";
import { buildVsix } from "../src/engine/vsix";

/** Reads any zip through its central directory (vsce writes compressed entries with data descriptors; our own reader is store-only). */
function readZip(zip: Uint8Array): Record<string, Uint8Array> {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let eocd = zip.length - 22;
  while (eocd >= 0 && v.getUint32(eocd, true) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("Not a zip");
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const out: Record<string, Uint8Array> = {};
  for (let i = 0; i < count; i++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error("Bad central directory");
    const method = v.getUint16(p + 10, true);
    const size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const extraLen = v.getUint16(p + 30, true);
    const commentLen = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const name = new TextDecoder().decode(zip.subarray(p + 46, p + 46 + nameLen));
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    const data = zip.subarray(start, start + size);
    out[name] = method === 8 ? new Uint8Array(inflateRawSync(data)) : data.slice();
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

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
    official = readZip(new Uint8Array(readFileSync(out)));
    ours = readZip(buildVsix(theme, options, assets));
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
