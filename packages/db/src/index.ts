import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

import pg from "pg";
import * as schema from "./schema";

export { schema };

export type Db = NodePgDatabase<typeof schema>;

let cachedPool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (cachedPool) return cachedPool;
  const connectionString =
    process.env.DATABASE_URL ??
    "postgresql://kept:kept@localhost:5432/kept";
  const pool = new pg.Pool({ connectionString, max: 10 });
  pool.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("pg pool error", err.message);
  });
  cachedPool = pool;
  return pool;
}

/**
 * Drizzle instance WITHOUT org scoping — internal/admin/worker use.
 */
export function createDb(): Db {
  return drizzle(getPool(), { schema });
}

/**
 * Request-scoped db with RLS: sets app.org_id GUC for the connection.
 * Money tables enforce RLS via `current_setting('app.org_id', true)`.
 * Must be used inside a transaction or a connection reserved per request.
 */
export async function createOrgScopedDb(orgId: string): Promise<Db> {
  const client = await getPool().connect();
  await client.query({ text: "select set_config('app.org_id', $1, true)", values: [orgId] });
  const db = drizzle(client, { schema }) as Db;
  const release = () => client.release();
  (db as unknown as { $release?: () => void }).$release = release;
  return db;
}

export async function runMigrations(): Promise<void> {
  const pool = getPool();
  const { readdirSync, existsSync } = await import("node:fs");
  const { join } = await import("node:path");
  const candidates = [
    process.env.MIGRATIONS_DIR,
    join(process.cwd(), "src", "drizzle"),
    join(process.cwd(), "packages", "db", "src", "drizzle"),
  ].filter(Boolean) as string[];
  const dir = candidates.find((d) => existsSync(d));
  if (!dir) throw new Error("migrations dir not found (tried: " + candidates.join(", ") + ")");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  await pool.query("create table if not exists kept_migrations (name text primary key, applied_at timestamptz default now())");
  for (const name of files) {
    const applied = await pool.query("select 1 from kept_migrations where name = $1", [name]);
    if (applied.rowCount && applied.rowCount > 0) continue;
    const client = await pool.connect();
    try {
      await client.query("begin");
      const exists = await client.query("select 1 from kept_migrations where name = $1", [name]);
      if (!exists.rowCount) {
        const sqlFile = (await import("node:fs")).readFileSync(join(dir, name), "utf8");
        await client.query(sqlFile);
        await client.query("insert into kept_migrations (name) values ($1)", [name]);
      }
      await client.query("commit");
      // eslint-disable-next-line no-console
      console.log(`migration applied: ${name}`);
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }
  }
}
