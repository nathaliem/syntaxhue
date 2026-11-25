# Search and analytics: setup and routine

Canonical address: **https://syntaxhue.dev/** (`www.syntaxhue.dev` and `syntaxhue.nathaliemaes.be` redirect to it with a 308 at the Vercel domain level; `hueprint-silk.vercel.app` redirects in `app/vercel.json`. Preview deployments are not redirected).

## What lives where

| Thing | File |
| --- | --- |
| Title, description, canonical, Open Graph, Twitter card, structured data, no-JavaScript text | `app/index.html` |
| Link preview picture (1200x630) | `app/public/og.png`, regenerated with `node ci/og-image.mjs` (run in `app/`) |
| robots.txt, sitemap | `app/public/robots.txt`, `app/public/sitemap.xml` |
| Redirects and headers | `app/vercel.json` |
| About and privacy text (what is collected) | `app/src/ui/AboutDialog.tsx` |
| Event dictionary, Do Not Track, URL fragment stripping | `app/src/analytics.ts` |
| Tests for all of the above | `app/src/ui/About.test.tsx`, `app/src/analytics.test.ts` |

A share link keeps the whole theme after the `#`. That part is never in the canonical URL, the sitemap, or what analytics receives.

## One-time setup (needs the domain owner's accounts, not done by code)

1. **Google Search Console**: add a *Domain* property for `syntaxhue.dev`, add the TXT record it gives you at the DNS host, wait for "verified". Then Sitemaps > add `sitemap.xml`.
2. **Bing Webmaster Tools**: import the site from Search Console (or add a `CNAME`/TXT verification record), then submit the same sitemap.
3. **Vercel Web Analytics**: enable it on the project (Analytics tab). No cookies, so no banner is needed.
4. Check a link preview on two platforms (for example Slack and LinkedIn's Post Inspector, or opengraph.xyz) after each deploy that touches `index.html` or `og.png`.

## Events

Only listed events can be sent (`EVENT_DICTIONARY` in `app/src/analytics.ts`), with only the listed property values. Never send colors, theme names, links, or anything typed by a person. When Do Not Track is on, nothing is sent, not even page views.
Wired (HP-1004): `shuffle` and `edit` (first one per visit only, so a visit is counted once, not per click), `export` with `type` = settings, file, extension, editor or terminal (on copy or download), `share` (share link copied) and `library_save`. Page views come from `<Analytics>` itself. The tool is Vercel Web Analytics; custom events need a plan that includes them, so check the Vercel Analytics tab shows them after deploy. When you add an event, add it to the dictionary and to the "What is collected" text in `AboutDialog.tsx` in the same change.

## Monthly routine (15 minutes)

- Search Console > Performance: top queries and pages, any drop; Indexing > Pages: anything not indexed.
- Search Console > Core Web Vitals; run Lighthouse on the live URL (SEO should stay 90+).
- Vercel Analytics: visits, first export, export type, share, library save, return visits. Note anything that moved a lot.
- Check the share-link preview still renders, and that `https://syntaxhue.dev/robots.txt` and `/sitemap.xml` load.
- Click through the GitHub link, support link and the About dialog for breakage.
