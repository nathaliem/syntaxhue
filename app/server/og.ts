import { decodeTheme } from "../src/engine/share";
import { renderCard, type CardFont } from "../src/server/renderCard";
import { SHARE_CODE } from "../src/server/shareMeta";

let fonts: Promise<CardFont[]> | undefined;

function loadFonts(origin: string) {
  fonts ??= Promise.all(
    [
      ["jetbrains-mono-latin-400-normal.woff", 400, "normal"],
      ["jetbrains-mono-latin-700-normal.woff", 700, "normal"],
      ["jetbrains-mono-latin-400-italic.woff", 400, "italic"],
    ].map(async ([file, weight, style]) => {
      const res = await fetch(`${origin}/fonts/${file}`);
      if (!res.ok) throw new Error(`font ${file}: ${res.status}`);
      return {
        name: "JetBrains Mono",
        data: await res.arrayBuffer(),
        weight: weight as 400 | 700,
        style: style as "normal" | "italic",
      };
    }),
  ).catch((e) => {
    fonts = undefined;
    throw e;
  });
  return fonts;
}

/** The preview picture for a shared theme. A code we can't read gets the generic card instead. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("t") ?? "";
  const theme = SHARE_CODE.test(code) ? decodeTheme(code) : null;
  if (!theme) return Response.redirect(`${url.origin}/og.png`, 302);
  try {
    const png = await renderCard(theme, await loadFonts(url.origin));
    return new Response(png as BodyInit, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    });
  } catch {
    return Response.redirect(`${url.origin}/og.png`, 302);
  }
}
