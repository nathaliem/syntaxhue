// Bundles the link-preview functions (server/*.ts) into api/*.js. Vercel's function builder doesn't resolve the
// extensionless imports in src/, so each function is bundled into one file first. The output is committed (Vercel only detects
// functions in the repo, not ones made during the build); `npm run check` fails if it is out of date: run `npm run build:api`.
import { rolldown } from "rolldown";

for (const name of ["og", "share"]) {
  const bundle = await rolldown({
    input: `server/${name}.ts`,
    platform: "node",
    external: ["@resvg/resvg-js"],
    logLevel: "warn",
  });
  await bundle.write({ file: `api/${name}.js`, format: "esm" });
  await bundle.close();
}
