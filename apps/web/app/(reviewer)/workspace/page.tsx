import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db, schema, eq, and, desc, sql } from "@/lib/db";
import { getOrgForUser } from "@/lib/org";
import { formatMoney, CATEGORY_LABELS } from "@/lib/utils";
import { ReviewQueue } from "@/components/reviewer/review-queue";
import { SignOffCard } from "@/components/reviewer/sign-off-card";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) return null;
  const org = await getOrgForUser(user.id);
  if (!org) return null;
  const { org: o, role } = org;

  const [tasks, pendingCloses, stats] = await Promise.all([
    db
      .select({
        id: schema.reviewTasks.id,
        transactionId: schema.reviewTasks.transactionId,
        notes: schema.reviewTasks.notes,
        createdAt: schema.reviewTasks.createdAt,
        tx: {
          description: schema.transactions.description,
          amount: schema.transactions.amount,
          date: schema.transactions.date,
          category: schema.transactions.category,
          confidence: schema.transactions.confidence,
          status: schema.transactions.status,
        },
      })
      .from(schema.reviewTasks)
      .innerJoin(schema.transactions, eq(schema.transactions.id, schema.reviewTasks.transactionId))
      .where(and(eq(schema.reviewTasks.orgId, o.id), eq(schema.reviewTasks.status, "queued")))
      .orderBy(asc(schema.reviewTasks.createdAt))
      .limit(50),
    db
      .select({
        period: schema.closes.period,
        dueDate: schema.closes.dueDate,
        status: schema.closes.status,
      })
      .from(schema.closes)
      .where(and(eq(schema.closes.orgId, o.id), sql`${schema.closes.status} != 'done'`))
      .orderBy(desc(schema.closes.period)),
    db
      .select({
        total: sql<string>`count(*)::int`,
        auto: sql<string>`count(*) filter (where ${schema.transactions.status} = 'auto')::int`,
        reclassified: sql<string>`count(*) filter (where ${schema.transactions.status} = 'reclassified')::int`,
      })
      .from(schema.transactions)
      .where(eq(schema.transactions.orgId, o.id)),
  ]);

  const total = Number(stats[0]?.total ?? 0);
  const auto = Number(stats[0]?.auto ?? 0);
  const reclassified = Number(stats[0]?.reclassified ?? 0);
  const autoRate = total ? Math.round((auto / total) * 100) : 0;
  const errorRate = auto ? Math.round((reclassified / auto) * 100) : 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Reviewer desk · {o.name}</p>
          <h1 className="font-display text-4xl text-ink">The Review</h1>
        </div>
        <Link href="/dashboard" className="font-mono-label text-xs text-amber-deep hover:underline">
          ← Back to overview
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Auto-sorted", `${autoRate}%`, "of transactions sorted by the engine"],
          ["Error rate", `${errorRate}%`, "human-corrections ÷ auto-sorted (target ≤2%)"],
          ["In queue", `${tasks.length}`, "transactions waiting on a human"],
        ].map(([label, value, sub]) => (
          <div key={label} className="card p-5">
            <p className="font-mono-label text-[11px] uppercase tracking-wider text-ink-soft">{label}</p>
            <p className="mt-2 font-display text-3xl text-ink">{value}</p>
            <p className="mt-1 text-xs text-ink-soft">{sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="font-display mb-4 text-2xl text-ink">Queue</h2>
          <ReviewQueue tasks={tasks} categories={Object.keys(CATEGORY_LABELS)} />
        </div>
        <div>
          <h2 className="font-display mb-4 text-2xl text-ink">Closes to sign</h2>
          <SignOffCard closes={pendingCloses} role={role} />
        </div>
      </div>
    </div>
  );
}

function asc(col: any) {
  return sql`${col} asc`;
}
