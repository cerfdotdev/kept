import { createDb, schema } from "@kept/db";
import { and, eq, gte } from "drizzle-orm";

// Deterministic PRNG seeded per org so demo data is stable-ish
function seededRng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

interface FeedEntry {
  description: string;
  amount: number; // dollars, negative = expense
  externalId: string;
}

const PROFILES: Record<string, { income: string[]; expenses: string[]; incomeMin: number; incomeMax: number }> = {
  trades: {
    income: ["Stripe payment from client", "Square payment", "ACH deposit - Homeowner payment", "Venmo payment - job"],
    expenses: [
      "Home Depot #2043", "Lowe's #1922", "Shell station", "Chevron", "Milwaukee Tool", "Grainger", "Uber ride",
      "Doordash order", "Chipotle", "Geico insurance", "Starbucks", "Fastenal", "Harbor Freight", "Verizon Wireless",
    ],
    incomeMin: 450,
    incomeMax: 3400,
  },
  ecommerce: {
    income: ["Stripe payout", "Shopify Payments settlement", "PayPal receipt", "Square payout"],
    expenses: [
      "Shopify subscription", "Amazon ads", "Google Ads", "Meta Ads", "FedEx", "UPS", "USPS", "Adobe Creative Cloud",
      "AWS", "Staples", "Walmart", "Costco", "Slack",
    ],
    incomeMin: 180,
    incomeMax: 2100,
  },
  agency: {
    income: ["Stripe payout - client retainer", "PayPal receipt", "ACH deposit - retainer"],
    expenses: [
      "HubSpot", "Slack", "Zoom", "Adobe", "Google Workspace", "Microsoft 365", "Google Ads", "Meta Ads",
      "Starbucks", "Chipotle", "Doordash", "Delta Airlines", "Marriott", "Uber", "AWS", "Notion",
    ],
    incomeMin: 900,
    incomeMax: 6500,
  },
  freelance: {
    income: ["Stripe payout", "Venmo payment", "Zelle deposit", "PayPal receipt"],
    expenses: [
      "QuickBooks", "Gusto", "Adobe", "Zoom", "Slack", "Google Workspace", "IRS", "Starbucks", "Chipotle",
      "Geico", "Progressive", "Verizon", "AT&T",
    ],
    incomeMin: 250,
    incomeMax: 1800,
  },
};

export function businessTypeOf(settings: Record<string, unknown> | null): string {
  const t = settings?.businessType;
  if (typeof t === "string" && t in PROFILES) return t;
  return "trades";
}

export function generateFeedEntries(orgId: string, businessType: string, daysBack: number, rng: () => number): FeedEntry[] {
  const profile = PROFILES[businessType] ?? PROFILES.trades;
  const entries: FeedEntry[] = [];
  const count = 4 + Math.floor(rng() * 9);
  for (let i = 0; i < count; i++) {
    const isIncome = rng() < 0.42;
    const pick = isIncome ? profile.income : profile.expenses;
    const description = pick[Math.floor(rng() * pick.length)];
    const amount =
      isIncome
        ? (profile.incomeMin + rng() * (profile.incomeMax - profile.incomeMin)).toFixed(2)
        : (-(8 + rng() * 620)).toFixed(2);
    const dayOffset = Math.floor(rng() * daysBack);
    const date = new Date(Date.now() - dayOffset * 86_400_000).toISOString().slice(0, 10);
    entries.push({
      description,
      amount: Number(amount),
      externalId: `${orgId}-${date}-${i}-${Math.floor(rng() * 1e6)}`,
    });
  }
  return entries;
}

/**
 * For every org with an active demo bank account, insert a batch of
 * fresh demo transactions (deduped by externalId). Called on schedule.
 */
export async function ingestDemoFeeds(): Promise<number> {
  const db = createDb();
  const accounts = await db
    .select({ id: schema.bankAccounts.id, orgId: schema.bankAccounts.orgId })
    .from(schema.bankAccounts)
    .where(eq(schema.bankAccounts.provider, "demo"));

  let inserted = 0;
  for (const account of accounts) {
    const [org] = await db
      .select({ settings: schema.orgs.settings })
      .from(schema.orgs)
      .where(eq(schema.orgs.id, account.orgId));
    if (!org) continue;
    const rng = seededRng(`${account.orgId}:${new Date().toISOString().slice(0, 10)}`);
    const entries = generateFeedEntries(account.orgId, businessTypeOf(org.settings), 14, rng);

    for (const e of entries) {
      const existing = await db
        .select({ id: schema.transactions.id })
        .from(schema.transactions)
        .where(
          and(
            eq(schema.transactions.orgId, account.orgId),
            eq(schema.transactions.accountId, account.id),
            eq(schema.transactions.externalId, e.externalId),
          ),
        )
        .limit(1);
      if (existing.length > 0) continue;
      await db.insert(schema.transactions).values({
        orgId: account.orgId,
        accountId: account.id,
        externalId: e.externalId,
        date: new Date().toISOString().slice(0, 10),
        amount: e.amount.toFixed(4),
        description: e.description,
        memo: null,
        category: "uncategorized",
        confidence: "0",
        riskTier: "t1",
        status: "pending_review",
        ruleRef: null,
      });
      inserted++;
    }
  }
  return inserted;
}

export async function hasTransactionsAfter(orgId: string, cutoff: Date): Promise<boolean> {
  const db = createDb();
  const rows = await db
    .select({ id: schema.transactions.id })
    .from(schema.transactions)
    .where(and(eq(schema.transactions.orgId, orgId), gte(schema.transactions.createdAt, cutoff)))
    .limit(1);
  return rows.length > 0;
}
