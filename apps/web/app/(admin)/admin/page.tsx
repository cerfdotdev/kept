import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db, schema, eq, and, sql, gte } from "@/lib/db";
import { getOrgForUser } from "@/lib/org";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) return null;
  const org = await getOrgForUser(user.id);
  if (!org || org.role !== "owner") return null;

  const orgs = await db
    .select({
      id: schema.orgs.id,
      name: schema.orgs.name,
      slug: schema.orgs.slug,
      plan: schema.orgs.plan,
      createdAt: schema.orgs.createdAt,
    })
    .from(schema.orgs)
    .orderBy(sql`created_at desc`)
    .limit(100);

  const rows = [];
  for (const o of orgs) {
    const [stats] = await db
      .select({
        total: sql<string>`count(*)::int`,
        auto: sql<string>`count(*) filter (where ${schema.transactions.status} = 'auto')::int`,
        reclassified: sql<string>`count(*) filter (where ${schema.transactions.status} = 'reclassified')::int`,
      })
      .from(schema.transactions)
      .where(eq(schema.transactions.orgId, o.id));
    const total = Number(stats?.total ?? 0);
    const auto = Number(stats?.auto ?? 0);
    const reclassified = Number(stats?.reclassified ?? 0);
    const [closeStats] = await db
      .select({
        done: sql<string>`count(*) filter (where ${schema.closes.status} = 'done')::int`,
        slaMet: sql<string>`count(*) filter (where ${schema.closes.slaMet} = true)::int`,
      })
      .from(schema.closes)
      .where(eq(schema.closes.orgId, o.id));
    rows.push({
      org: o,
      total,
      auto,
      reclassified,
      autoRate: total ? Math.round((auto / total) * 100) : 0,
      errorRate: auto ? Math.round((reclassified / auto) * 100) : 0,
      closesDone: Number(closeStats?.done ?? 0),
      slaMet: Number(closeStats?.slaMet ?? 0),
    });
  }

  const last30 = await db
    .select({ n: sql<string>`count(*)::int` })
    .from(schema.auditLog)
    .where(and(gte(schema.auditLog.createdAt, new Date(Date.now() - 30 * 86_400_000)), eq(schema.auditLog.action, "billing.canceled")));

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Operations</p>
          <h1 className="font-display text-4xl text-ink">Kill-gate dashboard</h1>
        </div>
        <Link href="/dashboard" className="font-mono-label text-xs text-amber-deep hover:underline">
          ← Back
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[
          ["Organizations", `${orgs.length}`],
          ["Auto-sort rate (all orgs)", `${rows.length ? Math.round(rows.reduce((a, r) => a + r.auto, 0) / Math.max(1, rows.reduce((a, r) => a + r.total, 0)) * 100) : 0}%`],
          ["Error rate (target ≤2%)", `${rows.length ? Math.round((rows.reduce((a, r) => a + r.reclassified, 0) / Math.max(1, rows.reduce((a, r) => a + r.auto, 0))) * 100) : 0}%`],
          ["Closes on time", `${rows.reduce((a, r) => a + r.slaMet, 0)}/${rows.reduce((a, r) => a + r.closesDone, 0)}`],
          ["Cancellations (30d)", `${Number(last30[0]?.n ?? 0)}`],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="font-mono-label text-[10px] uppercase tracking-wider text-ink-soft">{label}</p>
            <p className="mt-1.5 font-display text-2xl text-ink">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line font-mono-label text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="px-5 py-3">Org</th>
              <th className="px-5 py-3">Plan</th>
              <th className="px-5 py-3">Tx</th>
              <th className="px-5 py-3">Auto %</th>
              <th className="px-5 py-3">Error %</th>
              <th className="px-5 py-3">Closes</th>
              <th className="px-5 py-3">SLA met</th>
              <th className="px-5 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.org.id} className="border-b border-line/60 last:border-0">
                <td className="max-w-[14rem] truncate px-5 py-3 text-ink">{r.org.name}</td>
                <td className="px-5 py-3 font-mono-label text-xs text-ink-soft">{r.org.plan}</td>
                <td className="px-5 py-3 font-mono-label text-xs text-ink-soft">{r.total}</td>
                <td className="px-5 py-3 font-mono-label text-xs text-ink">{r.autoRate}%</td>
                <td className={`px-5 py-3 font-mono-label text-xs ${r.errorRate > 2 ? "text-red-700" : "text-signal"}`}>
                  {r.errorRate}%
                </td>
                <td className="px-5 py-3 font-mono-label text-xs text-ink-soft">{r.closesDone}</td>
                <td className="px-5 py-3 font-mono-label text-xs text-ink-soft">{r.slaMet}</td>
                <td className="px-5 py-3 font-mono-label text-xs text-ink-soft">
                  {r.org.createdAt.toISOString().slice(0, 10)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
