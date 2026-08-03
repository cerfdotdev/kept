import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db, schema, eq, desc } from "@/lib/db";
import { getOrgForUser } from "@/lib/org";
import { formatMoney, formatDate } from "@/lib/utils";
import { AckButtons } from "@/components/portal/ack-buttons";

export const dynamic = "force-dynamic";

export default async function ClosePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) return null;
  const org = await getOrgForUser(user.id);
  if (!org) return null;
  const { org: o } = org;

  const closes = await db
    .select({
      period: schema.closes.period,
      status: schema.closes.status,
      dueDate: schema.closes.dueDate,
      slaMet: schema.closes.slaMet,
      signedOffAt: schema.closes.signedOffAt,
      clientAck: schema.closes.clientAck,
      notes: schema.closes.notes,
    })
    .from(schema.closes)
    .where(eq(schema.closes.orgId, o.id))
    .orderBy(desc(schema.closes.period));

  const current = closes[0];

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-2">The Review</p>
        <h1 className="font-display text-4xl text-ink">This month&apos;s close</h1>
      </div>

      {current && (
        <div className="card p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono-label text-[11px] uppercase tracking-wider text-ink-soft">
                Period {current.period} · due {formatDate(current.dueDate)} at 8:02am
              </p>
              <h2 className="mt-2 font-display text-3xl text-ink">
                {current.status === "done"
                  ? current.slaMet
                    ? "Closed on time."
                    : "Closed — you were credited."
                  : current.status === "in_review"
                    ? "In review."
                    : "In progress."}
              </h2>
              {current.signedOffAt && (
                <p className="mt-2 text-sm text-ink-soft">
                  Signed off by your reviewer on {formatDate(current.signedOffAt)}
                </p>
              )}
            </div>
            <span className="rounded-full border border-line px-4 py-1.5 font-mono-label text-xs text-ink-soft">
              {current.status}
            </span>
          </div>

          <div className="mt-8 border-t border-line pt-8">
            <h3 className="font-display text-xl text-ink">The Kept Promise — on time, or it costs us</h3>
            <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">
              If your books aren&apos;t closed by 8:02am on the close date, you get an automatic
              credit — no forms, no phone calls. This month&apos;s close{" "}
              <span className="font-medium text-ink">
                {current.status === "done" ? (current.slaMet ? "was on time." : "was late — credit issued.") : "is on track."}
              </span>
            </p>
          </div>

          {current.status === "done" && current.clientAck === null && (
            <div className="mt-8 border-t border-line pt-8">
              <p className="font-display text-lg text-ink">Does it look right?</p>
              <p className="mt-1 text-sm text-ink-soft">
                One check per month. If something looks off, it goes straight back to your reviewer.
              </p>
              <div className="mt-4 flex gap-3">
                <AckButtons period={current.period} ack={current.clientAck} />
              </div>
            </div>
          )}

          {current.clientAck && (
            <p className="mt-6 font-mono-label text-xs text-signal">
              You marked this close as {current.clientAck === "ok" ? "correct." : "needing a fix — your reviewer is on it."}
            </p>
          )}
        </div>
      )}

      <div className="card p-6">
        <h3 className="font-display text-xl text-ink">Close history</h3>
        <div className="mt-4 space-y-3">
          {closes.map((c: { period: string; status: string; dueDate: string; slaMet: boolean | null; signedOffAt: Date | null; clientAck: string | null; notes: string | null }) => (
            <div key={c.period} className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3 last:border-0">
              <div>
                <p className="font-medium text-ink">{c.period}</p>
                <p className="text-sm text-ink-soft">
                  {c.status === "done"
                    ? `Closed ${c.signedOffAt ? formatDate(c.signedOffAt) : ""} · ${c.slaMet ? "on time" : "late — credit applied"}`
                    : "In progress"}
                </p>
              </div>
              <span className="font-mono-label text-xs text-ink-soft">{c.status}</span>
            </div>
          ))}
          {closes.length === 0 && <p className="text-sm text-ink-soft">No closes yet.</p>}
        </div>
      </div>
    </div>
  );
}
