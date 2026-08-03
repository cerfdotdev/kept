import { createDb, schema } from "@kept/db";
import { and, eq, isNull, lt, ne, sql } from "drizzle-orm";
import PgBoss from "pg-boss";
import { classifyTransaction, OpenAiCompatibleAdapter } from "./classification/classifier.js";
import { normalizeText } from "./classification/rules.js";
import { ingestDemoFeeds } from "./demo-feed.js";
import { seedGlobalMerchantsIfEmpty } from "./seed.js";

const llm = new OpenAiCompatibleAdapter();
let boss: PgBoss | null = null;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentPeriod(): string {
  return today().slice(0, 7);
}

function businessDay5Of(period: string): string {
  // 5th business day of the month (approximation: skip weekends, ignore holidays in v0)
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  let count = 0;
  while (count < 5) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString().slice(0, 10);
}

/* ------------------------------ jobs ------------------------------ */

async function jobClassify(): Promise<number> {
  const db = createDb();
  const pending = await db
    .select({
      id: schema.transactions.id,
      orgId: schema.transactions.orgId,
      accountId: schema.transactions.accountId,
      amount: schema.transactions.amount,
      description: schema.transactions.description,
    })
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.status, "pending_review"),
        sql`${schema.transactions.category} = 'uncategorized'`,
      ),
    )
    .limit(500);

  let processed = 0;
  // eslint-disable-next-line no-console
  console.log(`classification: found ${pending.length} pending (orgs: ${new Set(pending.map((p) => p.orgId)).size})`);
  for (const tx of pending) {
    const cents = Math.round(Number(tx.amount) * 100);
    const [merchantRows] = await db
      .select({
        id: schema.merchants.id,
        normalizedName: schema.merchants.normalizedName,
        displayName: schema.merchants.displayName,
        category: schema.merchants.category,
      })
      .from(schema.merchants)
      .where(
        sql`${schema.merchants.normalizedName} % ${normalizeText(tx.description)}`,
      )
      .orderBy(sql`similarity(${schema.merchants.normalizedName}, ${normalizeText(tx.description)}) desc`)
      .limit(1);

    const match = merchantRows
      ? {
          merchantId: merchantRows.id,
          displayName: merchantRows.displayName,
          category: merchantRows.category as never,
          similarity: 0.75,
        }
      : null;

    const verdict = await classifyTransaction(tx.description, cents, match, llm);

    await db
      .update(schema.transactions)
      .set({
        category: verdict.category,
        confidence: verdict.confidence.toFixed(4),
        riskTier: verdict.tier,
        status: verdict.autoApprove ? "auto" : "pending_review",
        ruleRef: verdict.ruleRef ?? null,
        matchedMerchantId: verdict.matchedMerchantId ?? undefined,
      })
      .where(eq(schema.transactions.id, tx.id));

    if (!verdict.autoApprove) {
      await db
        .insert(schema.reviewTasks)
        .values({ orgId: tx.orgId, transactionId: tx.id, status: "queued" })
        .onConflictDoNothing();
    }
    processed++;
  }
  return processed;
}

async function jobOpenCloses(): Promise<number> {
  const db = createDb();
  const orgs = await db
    .select({ id: schema.orgs.id })
    .from(schema.orgs)
    .where(isNull(schema.orgs.onboardedAt));
  const period = currentPeriod();
  let opened = 0;
  for (const org of orgs) {
    const existing = await db
      .select({ id: schema.closes.id })
      .from(schema.closes)
      .where(and(eq(schema.closes.orgId, org.id), eq(schema.closes.period, period)))
      .limit(1);
    if (existing.length > 0) continue;
    await db.insert(schema.closes).values({
      orgId: org.id,
      period,
      dueDate: businessDay5Of(period),
      status: "open",
    });
    opened++;
  }
  return opened;
}

async function jobSlaSweep(): Promise<number> {
  const db = createDb();
  const overdue = await db
    .select({ id: schema.closes.id })
    .from(schema.closes)
    .where(
      and(
        ne(schema.closes.status, "done"),
        ne(schema.closes.status, "amended"),
        lt(schema.closes.dueDate, today()),
        isNull(schema.closes.slaMet),
      ),
    );
  for (const c of overdue) {
    await db.update(schema.closes).set({ slaMet: false }).where(eq(schema.closes.id, c.id));
  }
  // Closes signed off before/on due date are SLA-met
  const signed = await db
    .select({ id: schema.closes.id })
    .from(schema.closes)
    .where(
      and(
        sql`${schema.closes.signedOffAt} is not null`,
        sql`${schema.closes.signedOffAt}::date <= ${schema.closes.dueDate}`,
        isNull(schema.closes.slaMet),
      ),
    );
  for (const c of signed) {
    await db.update(schema.closes).set({ slaMet: true }).where(eq(schema.closes.id, c.id));
  }
  return overdue.length + signed.length;
}

async function jobEscrowExport(): Promise<number> {
  const dir = process.env.ESCROW_DIR ?? "/escrow";
  const db = createDb();
  const orgs = await db.select({ id: schema.orgs.id, slug: schema.orgs.slug }).from(schema.orgs);
  let exported = 0;
  for (const org of orgs) {
    const txs = await db
      .select({
        date: schema.transactions.date,
        description: schema.transactions.description,
        category: schema.transactions.category,
        amount: schema.transactions.amount,
        status: schema.transactions.status,
      })
      .from(schema.transactions)
      .where(eq(schema.transactions.orgId, org.id))
      .orderBy(schema.transactions.date);
    const lines = [
      "date,description,category,amount,status",
      ...txs.map((t: { date: string; description: string; category: string; amount: string; status: string }) => [
        t.date,
        `"${t.description.replace(/"/g, '""')}"`,
        t.category,
        t.amount,
        t.status,
      ].join(",")),
    ];
    const { mkdirSync, writeFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const orgDir = join(dir, org.slug);
    mkdirSync(orgDir, { recursive: true });
    const file = join(orgDir, `${currentPeriod()}-transactions.csv`);
    writeFileSync(file, lines.join("\n"), "utf8");
    exported++;
  }
  return exported;
}

async function jobSignOffPendingClose(orgId: string, period: string, reviewerId: string): Promise<void> {
  const db = createDb();
  await db
    .update(schema.closes)
    .set({ status: "done", signedOffBy: reviewerId, signedOffAt: new Date() })
    .where(and(eq(schema.closes.orgId, orgId), eq(schema.closes.period, period)));
}

/* ------------------------------ boot ------------------------------ */

async function main() {
  await seedGlobalMerchantsIfEmpty();

  boss = new PgBoss({
    connectionString: process.env.DATABASE_URL ?? "postgresql://kept:kept@localhost:5432/kept",
    application_name: "kept-worker",
    retryLimit: 5,
    retryDelay: 1,
  });

  boss.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("pg-boss error", err);
  });

  await boss.start();
  // eslint-disable-next-line no-console
  console.log("pg-boss started");

  await boss.createQueue("classification");
  await boss.createQueue("feed-ingest");
  await boss.createQueue("close-open");
  await boss.createQueue("sla-sweep");
  await boss.createQueue("escrow-export");

  await boss.schedule("feed-ingest", "0 */6 * * *", {}, { tz: "UTC" });
  await boss.schedule("close-open", "0 2 * * *", {}, { tz: "UTC" });
  await boss.schedule("sla-sweep", "5 * * * *", {}, { tz: "UTC" });
  await boss.schedule("escrow-export", "30 3 * * *", {}, { tz: "UTC" });
  await boss.schedule("classification", "*/1 * * * *", {}, { tz: "UTC" });

  await boss.work("feed-ingest", async () => {
    const n = await ingestDemoFeeds();
    // eslint-disable-next-line no-console
    console.log(`feed-ingest: ${n} transactions`);
    return { ok: true, count: n };
  });

  await boss.work("classification", async () => {
    const n = await jobClassify();
    // eslint-disable-next-line no-console
    console.log(`classification: ${n} classified`);
    return { ok: true, count: n };
  });

  await boss.work("close-open", async () => {
    const n = await jobOpenCloses();
    // eslint-disable-next-line no-console
    console.log(`close-open: ${n} opened`);
    return { ok: true, count: n };
  });

  await boss.work("sla-sweep", async () => {
    const n = await jobSlaSweep();
    // eslint-disable-next-line no-console
    console.log(`sla-sweep: ${n} evaluated`);
    return { ok: true, count: n };
  });

  await boss.work("escrow-export", async () => {
    const n = await jobEscrowExport();
    // eslint-disable-next-line no-console
    console.log(`escrow-export: ${n} orgs`);
    return { ok: true, count: n };
  });

  await boss.send("feed-ingest", {});
  await boss.send("classification", {});
  await boss.send("close-open", {});
  await boss.send("sla-sweep", {});

  const shutdown = async () => {
    // eslint-disable-next-line no-console
    console.log("worker shutting down");
    if (boss) await boss.stop({ graceful: true, timeout: 15_000 });
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("worker failed to start", e);
  process.exit(1);
});

export { jobSignOffPendingClose };
