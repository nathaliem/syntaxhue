/**
 * Link-preview support for shared themes. A preview link looks like `https://syntaxhue.dev/s?t=<code>`: the page is
 * the normal app, but the head carries the theme's name and a picture of it, so chat apps and social posts show
 * that theme instead of the generic card.
 */

/** Only the current compact share code is accepted by the server; anything else gets the generic card. */
export const SHARE_CODE = /^p[A-Za-z0-9_-]{60,400}$/;

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function setMeta(html: string, attr: "name" | "property", key: string, content: string): string {
  const tag = `<meta ${attr}="${key}" content="${escapeHtml(content)}" />`;
  const re = new RegExp(`<meta\\s[^>]*?${attr}="${key.replace(/[:.]/g, "\\$&")}"[^>]*>`);
  return re.test(html) ? html.replace(re, tag) : html.replace("</head>", `    ${tag}\n  </head>`);
}

export function shareHtml(html: string, opts: { origin: string; code: string; name: string }): string {
  const { origin, code, name } = opts;
  const url = `${origin}/s?t=${code}`;
  const image = `${origin}/api/og?t=${code}`;
  const title = `${name}: a VS Code color theme made with SyntaxHue`;
  const description =
    "Open this theme in SyntaxHue to tweak it, then paste it into VS Code or export it as an extension.";
  let out = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
  out = setMeta(out, "name", "description", description);
  out = setMeta(out, "property", "og:title", title);
  out = setMeta(out, "property", "og:description", description);
  out = setMeta(out, "property", "og:url", url);
  out = setMeta(out, "property", "og:image", image);
  out = setMeta(
    out,
    "property",
    "og:image:alt",
    `The colors of the theme “${name}” and a few lines of code painted with them`,
  );
  out = setMeta(out, "name", "twitter:title", title);
  out = setMeta(out, "name", "twitter:description", description);
  out = setMeta(out, "name", "twitter:image", image);
  // A shared theme is not a page to index: the canonical stays the home page and search engines are told to skip it.
  out = setMeta(out, "name", "robots", "noindex");
  return out;
}
