import { decodeTheme } from "../src/engine/share";
import { SHARE_CODE, shareHtml } from "../src/server/shareMeta";

/** `/s?t=<code>`: the normal app page, with the shared theme's name and picture in its head for link previews. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = await fetch(`${url.origin}/index.html`);
  const html = await page.text();
  const code = url.searchParams.get("t") ?? "";
  const theme = SHARE_CODE.test(code) ? decodeTheme(code) : null;
  return new Response(theme ? shareHtml(html, { origin: url.origin, code, name: theme.name }) : html, {
    status: page.status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
