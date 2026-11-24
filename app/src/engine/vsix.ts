import { extensionFiles, packageJson, slugify, type ExtensionAssets, type ExtensionOptions } from "./extension";
import type { ThemeState } from "./theme";
import { zipStore, type ZipInput } from "./zip";

/**
 * Builds the `.vsix`: the zip VS Code installs. Layout and manifest follow what `@vscode/vsce` writes for a
 * theme extension: `[Content_Types].xml` and `extension.vsixmanifest` at the top, the extension's own files
 * under `extension/`, with the license stored as `LICENSE.txt`. (HP-1107 checks it against real vsce output in CI.)
 */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const CONTENT_TYPES = `<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension=".json" ContentType="application/json"/><Default Extension=".md" ContentType="text/markdown"/><Default Extension=".png" ContentType="image/png"/><Default Extension=".txt" ContentType="text/plain"/><Default Extension=".vsixmanifest" ContentType="text/xml"/></Types>
`;

/** The official packager stores these under other names (found by the CI comparison with real vsce output). */
const PACKAGED_NAME: Record<string, string> = {
  LICENSE: "LICENSE.txt",
  "README.md": "readme.md",
  "CHANGELOG.md": "changelog.md",
};

function manifest(theme: ThemeState, o: ExtensionOptions, assets: ExtensionAssets): string {
  const pkg = packageJson(theme, o, assets);
  const prop = (id: string, value: string) => `      <Property Id="${id}" Value="${esc(value)}" />`;
  const repo = pkg.repository?.url;
  return `<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="${esc(pkg.name)}" Version="${esc(pkg.version)}" Publisher="${esc(pkg.publisher)}" />
    <DisplayName>${esc(pkg.displayName)}</DisplayName>
    <Description xml:space="preserve">${esc(pkg.description)}</Description>
    <Tags>${esc(pkg.keywords.join(","))}</Tags>
    <Categories>${esc(pkg.categories.join(","))}</Categories>
    <GalleryFlags>Public</GalleryFlags>
    <Properties>
${prop("Microsoft.VisualStudio.Code.Engine", pkg.engines.vscode)}
${prop("Microsoft.VisualStudio.Code.ExtensionDependencies", "")}
${prop("Microsoft.VisualStudio.Code.ExtensionPack", "")}
${prop("Microsoft.VisualStudio.Code.ExtensionKind", "ui,workspace")}
${prop("Microsoft.VisualStudio.Code.LocalizedLanguages", "")}
${repo ? prop("Microsoft.VisualStudio.Services.Links.Source", repo) + "\n" : ""}    </Properties>
    <License>extension/LICENSE.txt</License>
${assets.icon ? "    <Icon>extension/images/icon.png</Icon>\n" : ""}  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code"/>
  </Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/readme.md" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.Changelog" Path="extension/changelog.md" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.License" Path="extension/LICENSE.txt" Addressable="true" />
  </Assets>
</PackageManifest>
`;
}

/** The `.vsix` entries by path. Throws when the options would make the Marketplace refuse the package. */
export function vsixEntries(theme: ThemeState, o: ExtensionOptions, assets: ExtensionAssets = {}): ZipInput {
  const files = extensionFiles(theme, o, assets);
  const entries: ZipInput = {
    "[Content_Types].xml": CONTENT_TYPES,
    "extension.vsixmanifest": manifest(theme, o, assets),
  };
  for (const [path, text] of Object.entries(files)) {
    if (path === ".vscodeignore") continue; // only tells vsce what to leave out; not part of the package
    entries[`extension/${PACKAGED_NAME[path] ?? path}`] = text;
  }
  return entries;
}

export function buildVsix(theme: ThemeState, o: ExtensionOptions, assets: ExtensionAssets = {}): Uint8Array {
  return zipStore(vsixEntries(theme, o, assets));
}

export function vsixFileName(theme: ThemeState, o: Pick<ExtensionOptions, "id" | "version">): string {
  return `${o.id ?? slugify(theme.name)}-${o.version}.vsix`;
}
