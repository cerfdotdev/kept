import { build } from "esbuild";

const common = {
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node24",
  external: ["pg", "pg-boss", "drizzle-orm", "better-auth"],
  logLevel: "info",
};

await build({ ...common, entryPoints: ["src/index.ts"], outfile: "dist/index.js" });
await build({ ...common, entryPoints: ["src/migrate-entry.ts"], outfile: "dist/migrate-entry.js" });
