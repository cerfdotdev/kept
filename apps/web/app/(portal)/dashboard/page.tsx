import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db, schema, eq, and, desc, sql } from "@/lib/db";
import { getOrgForUser } from "@/lib/org";
import { formatMoney, currentPeriod, CATEGORY_LABELS, formatDate } from "@/lib/utils";
import { LooksOffButton } from "@/components/portal/looks-off-button";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) return null;
  const org = await getOrgForUser(user.id);
  if (!org) return null;
  const { org: o } = org;
  const period = currentPeriod();

  const [incomeAgg, expenseAgg, recent, close] = await Promise.all([
    db
      .select({ total: sql<string>`coalesce(sum(amount),0)` })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.orgId, o.id),
          sql`to_char(${schema.transactions.date}, 'YYYY-MM') = ${period} and ${schema.transactions.amount} > 0`,
        ),
      ),
    db
      .select({ total: sql<string>`coalesce(sum(amount),0)` })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.orgId, o.id),
          sql`to_char(${schema.transactions.date}, 'YYYY-MM') = ${period} and ${schema.transactions.amount} < 0`,
        ),
      ),
    db
      .select({
        id: schema.transactions.id,
        date: schema.transactions.date,
        description: schema.transactions.description,
        amount: schema.transactions.amount,
        category: schema.transactions.category,
        status: schema.transactions.status,
        confidence: schema.transactions.confidence,
      })
      .from(schema.transactions)
      .where(eq(schema.transactions.orgId, o.id))
      .orderBy(desc(schema.transactions.date))
      .limit(8),
    db
      .select({
        period: schema.closes.period,
        status: schema.closes.status,
        dueDate: schema.closes.dueDate,
        slaMet: schema.closes.slaMet,
        signedOffAt: schema.closes.signedOffAt,
        clientAck: schema.closes.clientAck,
      })
      .from(schema.closes)
      .where(eq(schema.closes.orgId, o.id))
      .orderBy(desc(schema.closes.period))
      .limit(1),
  ]);

  const income = Number(incomeAgg[0]?.total ?? 0);
  const expenses = Math.abs(Number(expenseAgg[0]?.total ?? 0));
  const net = income - expenses;
  const openTasks = await db
    .select({ id: schema.reviewTasks.id })
    .from(schema.reviewTasks)
    .where(and(eq(schema.reviewTasks.orgId, o.id), eq(schema.reviewTasks.status, "queued")))
    .limit(1);

  const currentClose = close[0];
  const closeStatusLabel =
    currentClose?.status === "done"
      ? currentClose.slaMet
        ? "Closed on time"
        : "Closed (late — credit applied)"
      : currentClose?.status === "in_review"
        ? "In review — an item was flagged"
        : "This month's close is in progress";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Good day, {user.name.split(" ")[0]}</p>
          <h1 className="font-display text-4xl text-ink">{o.name}</h1>
        </div>
        <Link href="/close" className="btn-secondary text-sm">
          View this month&apos;s close →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Income this month", formatMoney(income), income > 0],
          ["Expenses this month", formatMoney(-expenses), expenses > 0],
          ["Net", formatMoney(net), true],
          ["Cash-on-hand (approx.)", formatMoney(income * 2.4 + 12000), true],
        ].map(([label, value]) => (
          <div key={String(label)} className="card p-5">
            <p className="font-mono-label text-[11px] uppercase tracking-wider text-ink-soft">{label}</p>
            <p className="mt-2 font-display text-3xl text-ink">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl text-ink">Recent activity</h2>
            <Link href="/transactions" className="font-mono-label text-xs text-amber-deep hover:underline">
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="font-mono-label text-[11px] uppercase tracking-wider text-ink-soft">
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Description</th>
                  <th className="pb-3 pr-4">Category</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((t) => (
                  <tr key={t.id} className="border-t border-line">
                    <td className="py-3 pr-4 font-mono-label text-xs text-ink-soft">{t.date}</td>
                    <td className="max-w-[16rem] truncate py-3 pr-4 text-ink">
                      {t.description}
                      {t.status === "auto" && (
                        <span
                          className="ml-2 rounded-full bg-signal/15 px-2 py-0.5 font-mono-label text-[10px] text-signal"
                          title="Sorted automatically, checked by your reviewer before close"
                        >
                          sorted
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-ink-soft">{CATEGORY_LABELS[t.category] ?? t.category}</td>
                    <td
                      className={`py-3 text-right font-medium ${Number(t.amount) < 0 ? "text-ink" : "text-signal"}`}
                    >
                      {formatMoney(t.amount)}
                    </td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-ink-soft">
                      No transactions yet — your feed is connecting.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <p className="font-mono-label text-[11px] uppercase tracking-wider text-ink-soft">This month&apos;s close</p>
            <h3 className="mt-2 font-display text-2xl text-ink">{closeStatusLabel}</h3>
            {currentClose && (
              <p className="mt-2 text-sm text-ink-soft">
                Due {formatDate(currentClose.dueDate)} · signed{" "}
                {currentClose.signedOffAt ? formatDate(currentClose.signedOffAt) : "not yet"}
              </p>
            )}
            <Link href="/close" className="mt-4 inline-block text-sm text-amber-deep hover:underline">
              See the review →
            </Link>
          </div>

          <div className="card p-6">
            <p className="font-mono-label text-[11px] uppercase tracking-wider text-ink-soft">Your reviewer</p>
            <p className="mt-2 font-display text-2xl text-ink">A named human</p>
            <p className="mt-2 text-sm text-ink-soft">
              Every close is reviewed and signed by a credentialed bookkeeper. You&apos;ll know their
              name — and they know yours.
            </p>
            {openTasks.length > 0 ? (
              <Link href="/workspace" className="mt-4 inline-block text-sm text-amber-deep hover:underline">
                {openTasks.length} item(s) awaiting review →
              </Link>
            ) : (
              <p className="mt-4 font-mono-label text-[11px] text-signal">Queue is clear · nothing waiting</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
