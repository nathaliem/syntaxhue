/** Search and link-preview basics in index.html and public/ (HP-1008). Runs with the normal tests. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("search and sharing basics", () => {
  const html = readFileSync("index.html", "utf8");
  const meta = (attr: string, key: string) =>
    html.match(new RegExp(`<meta[^>]*${attr}="${key}"[^>]*content="([^"]*)"`))?.[1];

  it("has a title, description, one canonical URL without a fragment, and Open Graph and Twitter tags", () => {
    expect(html).toMatch(/<title>[^<]{20,70}<\/title>/);
    expect(meta("name", "description")?.length).toBeGreaterThan(80);
    expect(meta("name", "description")?.length).toBeLessThan(165);
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    expect(canonical).toBe("https://syntaxhue.dev/");
    expect(meta("property", "og:url")).toBe(canonical);
    expect(meta("property", "og:image")).toBe("https://syntaxhue.dev/og.png");
    expect(meta("name", "twitter:card")).toBe("summary_large_image");
    expect(meta("name", "twitter:image")).toBe(meta("property", "og:image"));
    for (const k of ["og:title", "og:description", "og:site_name"]) expect(meta("property", k)).toBeTruthy();
  });

  it("describes the app in structured data and in a no-JavaScript fallback", () => {
    const json = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
    expect(json["@type"]).toBe("SoftwareApplication");
    expect(json.offers.price).toBe("0");
    expect(html).toMatch(/<noscript>[\s\S]*Not affiliated with Microsoft[\s\S]*<\/noscript>/);
  });

  it("serves a robots.txt and sitemap that point at the canonical domain, and a 1200x630 preview image", () => {
    expect(readFileSync("public/robots.txt", "utf8")).toContain("Sitemap: https://syntaxhue.dev/sitemap.xml");
    const sitemap = readFileSync("public/sitemap.xml", "utf8");
    expect(sitemap).toContain("<loc>https://syntaxhue.dev/</loc>");
    expect(sitemap).not.toContain("#");
    const png = readFileSync("public/og.png");
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });
});
