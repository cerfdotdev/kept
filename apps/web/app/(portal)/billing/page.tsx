import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db, schema, eq } from "@/lib/db";
import { getOrgForUser } from "@/lib/org";
import { TIERS } from "@/lib/utils";
import { CheckoutButton, CancelButton } from "@/components/portal/billing-buttons";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) return null;
  const org = await getOrgForUser(user.id);
  if (!org) return null;
  const { org: o } = org;

  const sub = await db
    .select({ plan: schema.subscriptions.plan, status: schema.subscriptions.status, demo: schema.subscriptions.demo })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.orgId, o.id))
    .limit(1);

  const currentPlan = sub[0]?.plan ?? "essential";
  const isDemo = sub[0]?.demo ?? true;

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-2">Pricing</p>
        <h1 className="font-display text-4xl text-ink">Your plan</h1>
        {isDemo && (
          <p className="mt-3 inline-block rounded-full border border-amber/50 bg-amber/10 px-3 py-1 font-mono-label text-[11px] text-amber-deep">
            Demo mode — upgrades are simulated, no card charged
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {TIERS.map((tier, i) => {
          const active = tier.id === currentPlan;
          return (
            <div
              key={tier.id}
              className={
                active
                  ? "card relative flex flex-col border-ink p-7"
                  : "card relative flex flex-col p-7 opacity-90"
              }
            >
              {active && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-ink px-3 py-1 font-mono-label text-[10px] uppercase tracking-widest text-cream">
                  Current plan
                </span>
              )}
              <h3 className="font-display text-2xl text-ink">{tier.name}</h3>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-4xl text-ink">${tier.priceMonthly}</span>
                <span className="font-mono-label text-xs text-ink-soft">/month</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              {!active && <CheckoutButton plan={tier.id as never} />}
            </div>
          );
        })}
      </div>

      <div className="card p-6">
        <h2 className="font-display text-xl text-ink">Manage subscription</h2>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <span className="text-sm text-ink-soft">
            Status: <span className="font-medium text-ink">{sub[0]?.status ?? "active"}</span>
            {isDemo && " · demo"}
          </span>
          {currentPlan !== "essential" && <CancelButton />}
        </div>
        <p className="mt-4 max-w-2xl text-sm text-ink-soft">
          Cancelling is one click, any time. No calls, no retention scripts. Your books stay yours:
          export everything instantly, and keep full access for 90 days after you leave.
        </p>
      </div>
    </div>
  );
}
