import { createDb, schema } from "@kept/db";
import { sql } from "drizzle-orm";
import { normalizeText } from "./classification/rules.js";

const GLOBAL_MERCHANTS: Array<{ name: string; category: string }> = [
  { name: "Stripe", category: "income" },
  { name: "Square", category: "income" },
  { name: "PayPal", category: "income" },
  { name: "Shopify Payments", category: "income" },
  { name: "Venmo", category: "income" },
  { name: "Home Depot", category: "materials" },
  { name: "Lowe's", category: "materials" },
  { name: "Ace Hardware", category: "materials" },
  { name: "Grainger", category: "materials" },
  { name: "McMaster-Carr", category: "materials" },
  { name: "Shell", category: "fuel" },
  { name: "Chevron", category: "fuel" },
  { name: "Exxon", category: "fuel" },
  { name: "Speedway", category: "fuel" },
  { name: "Uber", category: "travel" },
  { name: "Lyft", category: "travel" },
  { name: "Delta Airlines", category: "travel" },
  { name: "Marriott", category: "travel" },
  { name: "Airbnb", category: "travel" },
  { name: "Google Ads", category: "advertising" },
  { name: "Meta Ads", category: "advertising" },
  { name: "TikTok Ads", category: "advertising" },
  { name: "HubSpot", category: "software" },
  { name: "Adobe", category: "software" },
  { name: "Slack", category: "software" },
  { name: "Zoom", category: "software" },
  { name: "QuickBooks", category: "software" },
  { name: "Gusto", category: "software" },
  { name: "Shopify", category: "software" },
  { name: "AWS", category: "software" },
  { name: "Google Workspace", category: "software" },
  { name: "Microsoft 365", category: "software" },
  { name: "Geico", category: "insurance" },
  { name: "Progressive", category: "insurance" },
  { name: "State Farm", category: "insurance" },
  { name: "Hiscox", category: "insurance" },
  { name: "Costco", category: "office" },
  { name: "Walmart", category: "office" },
  { name: "Staples", category: "office" },
  { name: "FedEx", category: "misc" },
  { name: "UPS", category: "misc" },
  { name: "USPS", category: "misc" },
  { name: "IRS", category: "taxes" },
  { name: "PG&E", category: "utilities" },
  { name: "Comcast", category: "utilities" },
  { name: "Verizon", category: "utilities" },
  { name: "AT&T", category: "utilities" },
  { name: "Waste Management", category: "utilities" },
  { name: "Milwaukee Tool", category: "tools" },
  { name: "Harbor Freight", category: "tools" },
  { name: "Fastenal", category: "tools" },
  { name: "Doordash", category: "meals" },
  { name: "Chipotle", category: "meals" },
  { name: "Starbucks", category: "meals" },
  { name: "Autozone", category: "vehicle" },
  { name: "O'Reilly Auto", category: "vehicle" },
  { name: "Napa Auto", category: "vehicle" },
  { name: "Property Management Co", category: "rent" },
  { name: "Bank of America", category: "bank_fees" },
  { name: "Chase", category: "bank_fees" },
];

export async function seedGlobalMerchantsIfEmpty(): Promise<void> {
  const db = createDb();
  const existing = await db.select({ id: schema.merchants.id }).from(schema.merchants).limit(1);
  if (existing.length > 0) return;
  const rows = GLOBAL_MERCHANTS.map((m) => ({
    orgId: null as string | null,
    normalizedName: normalizeText(m.name),
    displayName: m.name,
    category: m.category,
    pattern: null,
  }));
  await db.insert(schema.merchants).values(rows).onConflictDoNothing();
  // eslint-disable-next-line no-console
  console.log(`seeded ${rows.length} global merchants`);
}
