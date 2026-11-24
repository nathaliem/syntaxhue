import { describe, expect, it } from "vitest";
import { themeFile } from "./derive";
import { type ExtensionOptions } from "./extension";
import { buildVsix, vsixEntries, vsixFileName } from "./vsix";
import { generate } from "./theme";
import { crc32, unzipStore, zipStore } from "./zip";

const opts: ExtensionOptions = {
  publisher: "someone",
  version: "1.2.3",
  description: 'A "calm" <green> theme & more.',
  license: "MIT",
  author: "Some One",
  year: 2026,
  repository: "https://github.com/someone/velvet-meadow?a=1&b=2",
};
const theme = { ...generate(7, "dark"), name: "Velvet Meadow" };
const text = (b: Uint8Array) => new TextDecoder().decode(b);

describe("zip", () => {
  it("matches the standard CRC-32 check value", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("round-trips files, including empty ones and non-ASCII names and text", () => {
    const files = {
      "a.txt": "hello",
      "dir/é ü.md": "héllo wörld ✓",
      "empty.txt": "",
      bin: new Uint8Array([0, 1, 255]),
    };
    const back = unzipStore(zipStore(files));
    expect(Object.keys(back)).toEqual(Object.keys(files));
    expect(text(back["a.txt"])).toBe("hello");
    expect(text(back["dir/é ü.md"])).toBe("héllo wörld ✓");
    expect(back["empty.txt"]).toHaveLength(0);
    expect([...back["bin"]]).toEqual([0, 1, 255]);
  });

  it("is byte-for-byte deterministic and detects corruption", () => {
    const a = zipStore({ "x.txt": "same" });
    expect(zipStore({ "x.txt": "same" })).toEqual(a);
    const bad = a.slice();
    bad[30 + "x.txt".length] ^= 1; // flip a bit of the stored data
    expect(() => unzipStore(bad)).toThrow(/Checksum/);
    expect(() => unzipStore(new Uint8Array(30))).toThrow(/Not a zip/);
  });
});

describe(".vsix", () => {
  const entries = vsixEntries(theme, opts);
  const zip = unzipStore(buildVsix(theme, opts));

  it("has the layout VS Code expects", () => {
    expect(Object.keys(zip)).toEqual([
      "[Content_Types].xml",
      "extension.vsixmanifest",
      "extension/package.json",
      "extension/themes/velvet-meadow-color-theme.json",
      "extension/README.md",
      "extension/CHANGELOG.md",
      "extension/LICENSE.txt",
    ]);
    expect(Object.keys(zip).some((n) => n.includes(".vscodeignore"))).toBe(false);
  });

  it("carries the same theme file and package.json as the plain export", () => {
    expect(JSON.parse(text(zip["extension/themes/velvet-meadow-color-theme.json"]))).toEqual(themeFile(theme));
    const pkg = JSON.parse(text(zip["extension/package.json"]));
    expect(pkg.publisher).toBe("someone");
    expect(pkg.version).toBe("1.2.3");
  });

  it("describes the extension in the manifest, with markup characters escaped", () => {
    const m = entries["extension.vsixmanifest"];
    expect(m).toContain('Id="velvet-meadow" Version="1.2.3" Publisher="someone"');
    expect(m).toContain("<DisplayName>Velvet Meadow</DisplayName>");
    expect(m).toContain("A &quot;calm&quot; &lt;green&gt; theme &amp; more.");
    expect(m).toContain("<Categories>Themes</Categories>");
    expect(m).toContain('Value="https://github.com/someone/velvet-meadow?a=1&amp;b=2"');
  });

  it("lists, as assets, only files that are in the package", () => {
    const paths = [...entries["extension.vsixmanifest"].matchAll(/Path="([^"]+)"/g)].map((m) => m[1]);
    expect(paths.length).toBeGreaterThan(3);
    for (const p of paths) expect(zip[p], p).toBeDefined();
    expect(entries["extension.vsixmanifest"]).toContain("<License>extension/LICENSE.txt</License>");
  });

  it("is well-formed XML", () => {
    const parse = (x: string) => new DOMParser().parseFromString(x, "application/xml");
    for (const name of ["[Content_Types].xml", "extension.vsixmanifest"]) {
      expect(parse(entries[name]).querySelector("parsererror"), name).toBeNull();
    }
    // without a repository the optional property is left out entirely
    const bare = vsixEntries(theme, { ...opts, repository: undefined })["extension.vsixmanifest"];
    expect(parse(bare).querySelector("parsererror")).toBeNull();
    expect(bare).not.toContain("Links.Source");
  });

  it("refuses options the Marketplace would reject", () => {
    expect(() => buildVsix(theme, { ...opts, publisher: "Bad Publisher" })).toThrow(/publisher/);
  });

  it("names the file after the extension and version", () => {
    expect(vsixFileName(theme, opts)).toBe("velvet-meadow-1.2.3.vsix");
    expect(vsixFileName(theme, { ...opts, id: "meadow" })).toBe("meadow-1.2.3.vsix");
  });
});
