import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db, schema, eq } from "@/lib/db";
import { getOrgForUser } from "@/lib/org";
import { ExportButtons } from "@/components/portal/export-buttons";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) return null;
  const org = await getOrgForUser(user.id);
  if (!org) return null;
  const { org: o } = org;

  const [txCount, docCount, closeCount] = await Promise.all([
    db
      .select({ n: schema.transactions.id })
      .from(schema.transactions)
      .where(eq(schema.transactions.orgId, o.id)),
    db.select({ n: schema.documents.id }).from(schema.documents).where(eq(schema.documents.orgId, o.id)),
    db.select({ n: schema.closes.id }).from(schema.closes).where(eq(schema.closes.orgId, o.id)),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-2">Your data is yours</p>
        <h1 className="font-display text-4xl text-ink">Export & ownership</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Every number, receipt, and close in this account belongs to you. Export anything, any
          time — no forms, no tickets, no 30-day wait. A full copy of your data is also escrowed
          nightly, so it survives anything, including us.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Transactions", txCount.length],
          ["Documents", docCount.length],
          ["Monthly closes", closeCount.length],
        ].map(([label, n]) => (
          <div key={label} className="card p-5">
            <p className="font-mono-label text-[11px] uppercase tracking-wider text-ink-soft">{label}</p>
            <p className="mt-2 font-display text-3xl text-ink">{n}</p>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h2 className="font-display text-xl text-ink">Download your books</h2>
        <p className="mt-1 text-sm text-ink-soft">
          CSV for spreadsheets, or a QBO file for your accountant or any software you choose.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ExportButtons kind="csv" />
          <ExportButtons kind="qbo" />
        </div>
      </div>

      <div className="card border-ink/30 bg-ink p-6 text-cream">
        <h2 className="font-display text-xl">The escrow guarantee</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cream/80">
          Every night, a full snapshot of your books is written to tamper-proof storage we
          couldn&apos;t delete even if we wanted to. If anything ever happened to us, you get your
          data — not a promise, a file. That&apos;s the anti-lock-in part of the Kept Promise.
        </p>
      </div>
    </div>
  );
}
