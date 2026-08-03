import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db, schema, eq, and, desc, sql, or, like } from "@/lib/db";
import { getOrgForUser } from "@/lib/org";
import { formatMoney, CATEGORY_LABELS } from "@/lib/utils";
import { LooksOffButton } from "@/components/portal/looks-off-button";
import { TransactionFilter } from "@/components/portal/transaction-filter";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) return null;
  const org = await getOrgForUser(user.id);
  if (!org) return null;
  const { org: o } = org;
  const { q, cat } = await searchParams;

  const conditions = [eq(schema.transactions.orgId, o.id)];
  if (q) conditions.push(like(schema.transactions.description, `%${q}%`));
  if (cat && cat !== "all") conditions.push(eq(schema.transactions.category, cat));

  const txs = await db
    .select({
      id: schema.transactions.id,
      date: schema.transactions.date,
      description: schema.transactions.description,
      amount: schema.transactions.amount,
      category: schema.transactions.category,
      status: schema.transactions.status,
      confidence: schema.transactions.confidence,
      memo: schema.transactions.memo,
    })
    .from(schema.transactions)
    .where(and(...conditions))
    .orderBy(desc(schema.transactions.date))
    .limit(300);

  const categories = await db
    .selectDistinct({ category: schema.transactions.category })
    .from(schema.transactions)
    .where(eq(schema.transactions.orgId, o.id))
    .orderBy(sql`category`);

  const statusDot = (status: string) => {
    if (status === "auto") return ["bg-signal", "Sorted automatically — verified before close"];
    if (status === "pending_review") return ["bg-amber", "Waiting on your reviewer"];
    return ["bg-ink", "Reviewed by a human"];
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Ledger</p>
        <h1 className="font-display text-4xl text-ink">Transactions</h1>
      </div>

      <TransactionFilter
        categories={categories.map((c: { category: string }) => c.category)}
        currentQ={q ?? ""}
        currentCat={cat ?? "all"}
      />

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line font-mono-label text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Description</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Amount</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {txs.map((t: { id: string; date: string; description: string; amount: string; category: string; status: string; confidence: string; memo: string | null }) => {
              const [dotClass, dotTitle] = statusDot(t.status);
              return (
                <tr key={t.id} className="border-b border-line/60 last:border-0">
                  <td className="whitespace-nowrap px-5 py-3 font-mono-label text-xs text-ink-soft">{t.date}</td>
                  <td className="max-w-[18rem] truncate px-5 py-3 text-ink" title={t.description}>
                    {t.description}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-ink-soft">
                    {CATEGORY_LABELS[t.category] ?? t.category}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <span className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden="true" />
                      <span className="font-mono-label text-[11px] text-ink-soft" title={dotTitle}>
                        {t.status === "auto" ? "sorted" : t.status === "pending_review" ? "review" : "kept"}
                      </span>
                    </span>
                  </td>
                  <td
                    className={`whitespace-nowrap px-5 py-3 text-right font-medium ${Number(t.amount) < 0 ? "text-ink" : "text-signal"}`}
                  >
                    {formatMoney(t.amount)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right">
                    <LooksOffButton transactionId={t.id} flagged={Boolean(t.memo?.includes("looks-off"))} />
                  </td>
                </tr>
              );
            })}
            {txs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-ink-soft">
                  Nothing here yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
