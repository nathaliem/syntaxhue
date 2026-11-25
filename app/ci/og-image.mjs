// Renders public/og.png (1200x630), the picture link previews show. Run: node ci/og-image.mjs
// Colors come from the first curated theme, so the card shows what the generator makes.
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const themes = JSON.parse(
  readFileSync(new URL("../src/engine/__fixtures__/curated-themes.json", import.meta.url), "utf8"),
);
const c = themes.find((t) => t.mode === "dark").colors;

const html = `<!doctype html><meta charset="utf-8"><style>
  html,body{margin:0}
  body{width:1200px;height:630px;background:${c.bg};color:${c.fg};font-family:"Instrument Sans",system-ui,sans-serif;display:flex;align-items:center;padding:0 80px;box-sizing:border-box}
  .l{flex:0 0 500px;margin-right:40px}
  h1{font-size:84px;margin:0 0 16px;letter-spacing:-2px;color:${c.fg}}
  p{font-size:32px;line-height:1.35;margin:0;color:${c.muted};max-width:460px}
  .code{font:26px/1.6 "JetBrains Mono",ui-monospace,monospace;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:32px 40px;flex:1}
  .k{color:${c.keyword};font-style:italic}.s{color:${c.string}}.f{color:${c.function}}.t{color:${c.type}}.n{color:${c.constant}}.v{color:${c.variable}}.o{color:${c.operator}}.m{color:${c.muted};font-style:italic}
  .sw{display:flex;gap:12px;margin-top:44px}.sw i{width:56px;height:56px;border-radius:14px}
</style><body>
<div class="l"><h1>SyntaxHue</h1><p>Make a VS Code color theme in minutes.</p>
<div class="sw">${["keyword", "string", "function", "type", "constant", "accent"].map((r) => `<i style="background:${c[r]}"></i>`).join("")}</div></div>
<div class="code"><span class="m">// shuffle, tune, export</span><br>
<span class="k">const</span> <span class="v">theme</span> <span class="o">=</span> <span class="f">shuffle</span><span class="o">(</span><span class="o">)</span><span class="o">;</span><br>
<span class="k">export</span> <span class="k">type</span> <span class="t">Palette</span> <span class="o">=</span> <span class="o">{</span><br>
&nbsp;&nbsp;<span class="v">name</span><span class="o">:</span> <span class="t">string</span><span class="o">;</span><br>
&nbsp;&nbsp;<span class="v">hue</span><span class="o">:</span> <span class="n">278</span><span class="o">;</span><br>
&nbsp;&nbsp;<span class="v">label</span><span class="o">:</span> <span class="s">"Quiet Harbor"</span><span class="o">;</span><br>
<span class="o">}</span></div></body>`;

const browser = await chromium.launch({ channel: process.env.CI ? undefined : "chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: "networkidle" });
await page.screenshot({ path: new URL("../public/og.png", import.meta.url).pathname });
await browser.close();
