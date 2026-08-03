import { runMigrations } from "./index.js";

const target = process.env.MIGRATE_TARGET ?? "up";

async function main() {
  if (target === "down") {
    // eslint-disable-next-line no-console
    console.log("down migrations not supported in v0; restore from backup");
    return;
  }
  await runMigrations();
  // eslint-disable-next-line no-console
  console.log("migrations complete");
  process.exit(0);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("migration failed", e);
  process.exit(1);
});
