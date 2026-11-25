// Bundles the link-preview functions (server/*.ts) into api/*.js. Vercel's function builder doesn't resolve the
// extensionless imports in src/, so each function is bundled into one file first. Generated, not committed.
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
