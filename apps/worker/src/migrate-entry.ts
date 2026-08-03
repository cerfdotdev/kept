import { runMigrations } from "@kept/db";

async function main() {
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
