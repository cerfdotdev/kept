import "server-only";
import { nanoid } from "nanoid";
import { db, schema, eq } from "./db";
import type { Session } from "./auth";

export async function requireUser(session: Session | null): Promise<Session["user"]> {
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  return session.user;
}

export async function getOrgForUser(userId: string): Promise<{
  org: typeof schema.orgs.$inferSelect;
  role: (typeof schema.memberships.$inferSelect)["role"];
} | null> {
  const membership = await db
    .select({
      org: schema.orgs,
      role: schema.memberships.role,
    })
    .from(schema.memberships)
    .innerJoin(schema.orgs, eq(schema.orgs.id, schema.memberships.orgId))
    .where(eq(schema.memberships.userId, userId))
    .limit(1);
  if (membership.length === 0) return null;
  return { org: membership[0].org, role: membership[0].role };
}

export async function createOrgWithDemo(user: { id: string; name: string; email: string }): Promise<string> {
  const slug = `${nanoid(10)}`.toLowerCase();
  const orgId = nanoid(24);
  const now = new Date();

  await db.transaction(async (tx: typeof db) => {
    await tx.insert(schema.orgs).values({
      id: orgId,
      name: user.name ? `${user.name}'s Business` : "My Business",
      slug,
      plan: "essential",
      onboardedAt: null,
      settings: { businessType: "trades", demo: true },
    });
    await tx.insert(schema.memberships).values({ orgId, userId: user.id, role: "owner" });
    await tx.insert(schema.bankAccounts).values({
      orgId,
      name: "Demo Checking",
      provider: "demo",
      externalId: `demo-${nanoid(8)}`,
    });
    await tx.insert(schema.subscriptions).values({ orgId, plan: "essential", status: "active", demo: true });
    await tx.insert(schema.closes).values({
      orgId,
      period: now.toISOString().slice(0, 7),
      dueDate: businessDay5Of(now.toISOString().slice(0, 7)),
      status: "open",
    });
  });

  // Seed a starter ledger so the dashboard is alive immediately.
  await seedStarterLedger(orgId);
  return orgId;
}

function businessDay5Of(period: string): string {
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

const STARTER = [
  { d: 62, desc: "Stripe payout 48215", amt: 2150.0 },
  { d: 61, desc: "QuickBooks subscription", amt: -72.0 },
  { d: 59, desc: "Home Depot #2043", amt: -184.32 },
  { d: 56, desc: "Shell station", amt: -61.4 },
  { d: 53, desc: "Square payment", amt: 1250.0 },
  { d: 50, desc: "Google Ads", amt: -340.12 },
  { d: 48, desc: "Lowe's #1922", amt: -96.77 },
  { d: 45, desc: "Venmo payment - job", amt: 480.0 },
  { d: 43, desc: "Uber ride", amt: -24.6 },
  { d: 41, desc: "Geico insurance", amt: -187.5 },
  { d: 38, desc: "Stripe payout 48902", amt: 3100.0 },
  { d: 36, desc: "Doordash order", amt: -38.25 },
  { d: 33, desc: "Fastenal", amt: -145.9 },
  { d: 30, desc: "Starbucks", amt: -6.45 },
  { d: 27, desc: "Milwaukee Tool", amt: -212.0 },
  { d: 24, desc: "PayPal receipt", amt: 960.0 },
  { d: 21, desc: "Chipotle", amt: -42.1 },
  { d: 18, desc: "Verizon Wireless", amt: -110.0 },
  { d: 14, desc: "Home Depot #2110", amt: -257.6 },
  { d: 11, desc: "Stripe payout 51277", amt: 1840.0 },
  { d: 8, desc: "Amazon ads", amt: -121.5 },
  { d: 5, desc: "Chevron", amt: -53.2 },
  { d: 2, desc: "Square payment", amt: 720.0 },
];

async function seedStarterLedger(orgId: string): Promise<void> {
  const [account] = await db
    .select({ id: schema.bankAccounts.id })
    .from(schema.bankAccounts)
    .where(eq(schema.bankAccounts.orgId, orgId))
    .limit(1);
  if (!account) return;
  const now = Date.now();
  for (const s of STARTER) {
    const date = new Date(now - s.d * 86_400_000).toISOString().slice(0, 10);
    await db
      .insert(schema.transactions)
      .values({
        orgId,
        accountId: account.id,
        externalId: `starter-${s.d}`,
        date,
        amount: s.amt.toFixed(4),
        description: s.desc,
        memo: null,
        category: "uncategorized",
        confidence: "0",
        riskTier: "t1",
        status: "pending_review",
        ruleRef: null,
      })
      .onConflictDoNothing();
  }
}

export function logAudit(args: {
  orgId?: string;
  actorId?: string;
  action: string;
  entity: string;
  entityId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}): Promise<void> {
  return db.insert(schema.auditLog).values(args).then(() => undefined);
}
