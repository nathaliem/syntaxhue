// Performance budget (HP-904): fails when the app's JavaScript outgrows perf-budget.json.
// Run after a build: node ci/budget.mjs   (also part of `npm run check` and CI)
// "Core" is every JavaScript file except the per-language grammar chunks, which load on demand.
import { readdirSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const cfg = JSON.parse(readFileSync(new URL("../perf-budget.json", import.meta.url), "utf8"));
const dir = new URL("../dist/assets/", import.meta.url);
const kb = (bytes) => bytes / 1000;
const files = readdirSync(dir).map((name) => ({
  name,
  gz: gzipSync(readFileSync(new URL(name, dir)), { level: 9 }).length,
}));
const isGrammar = (n) => n.endsWith(".js") && cfg.grammars.some((g) => n.startsWith(`${g}-`));

const js = files.filter((f) => f.name.endsWith(".js"));
const grammars = js.filter((f) => isGrammar(f.name));
const core = js.filter((f) => !isGrammar(f.name));
const css = files.filter((f) => f.name.endsWith(".css"));
const sum = (a) => a.reduce((t, f) => t + f.gz, 0);

const results = [
  ["Core JS", kb(sum(core)), cfg.budgets.coreJs],
  ["CSS", kb(sum(css)), cfg.budgets.css],
  ["Largest grammar", kb(Math.max(0, ...grammars.map((f) => f.gz))), cfg.budgets.largestGrammar],
];

const out = [];
out.push("Core JS files (gzip):");
for (const f of core.sort((a, b) => b.gz - a.gz)) out.push(`  ${kb(f.gz).toFixed(1).padStart(7)} KB  ${f.name}`);
out.push(`Grammar files: ${grammars.length} (${kb(sum(grammars)).toFixed(1)} KB together, loaded on demand)`);
let failed = false;
for (const [label, size, max] of results) {
  const over = size > max;
  failed ||= over;
  out.push(`${over ? "OVER " : "ok   "} ${label.padEnd(16)} ${size.toFixed(1).padStart(6)} KB of ${max} KB`);
}
if (grammars.length !== cfg.grammars.length) {
  failed = true;
  out.push(
    `OVER  expected ${cfg.grammars.length} grammar files, found ${grammars.length}: a grammar moved into core or the list is stale`,
  );
}
process.stdout.write(out.join("\n") + "\n");
process.exit(failed ? 1 : 0);
