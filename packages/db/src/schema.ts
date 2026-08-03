import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const planEnum = pgEnum("plan", ["essential", "growth", "pro"]);

export const roleEnum = pgEnum("org_role", ["owner", "admin", "bookkeeper_readonly"]);

export const txStatusEnum = pgEnum("tx_status", ["auto", "pending_review", "approved", "reclassified"]);

export const riskTierEnum = pgEnum("risk_tier", ["t1", "t2", "t3", "t4"]);

export const closeStatusEnum = pgEnum("close_status", ["open", "in_review", "done", "amended"]);

export const docStatusEnum = pgEnum("doc_status", ["uploaded", "processing", "processed", "error"]);

export const reviewVerdictEnum = pgEnum("review_verdict", ["approve", "reclassify", "uncertain"]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
]);

/* ---------- better-auth tables (required shape) ---------- */

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ---------- domain tables ---------- */

export const orgs = pgTable(
  "orgs",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    plan: planEnum("plan").notNull().default("essential"),
    onboardedAt: timestamp("onboarded_at"),
    settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("orgs_slug_idx").on(t.slug)],
);

export const memberships = pgTable(
  "memberships",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: text("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull().default("owner"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("memberships_org_user_idx").on(t.orgId, t.userId)],
);

export const bankAccounts = pgTable(
  "bank_accounts",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: text("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: varchar("type", { length: 32 }).notNull().default("checking"),
    provider: varchar("provider", { length: 32 }).notNull().default("demo"),
    externalId: text("external_id"),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("bank_accounts_org_idx").on(t.orgId)],
);

export const merchants = pgTable(
  "merchants",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    orgId: text("org_id"), // null = global catalog
    normalizedName: text("normalized_name").notNull(),
    displayName: text("display_name").notNull(),
    category: text("category").notNull(),
    pattern: text("pattern"), // sql LIKE or regex hint
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("merchants_name_idx").on(t.normalizedName), index("merchants_org_idx").on(t.orgId)],
);

export const transactions = pgTable(
  "transactions",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: text("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull().references(() => bankAccounts.id, { onDelete: "cascade" }),
    externalId: text("external_id"),
    date: date("date", { mode: "string" }).notNull(),
    amount: numeric("amount", { precision: 19, scale: 4 }).notNull(),
    description: text("description").notNull(),
    memo: text("memo"),
    category: text("category").notNull().default("uncategorized"),
    confidence: numeric("confidence", { precision: 5, scale: 4 }).notNull().default("0"),
    riskTier: riskTierEnum("risk_tier").notNull().default("t1"),
    status: txStatusEnum("status").notNull().default("pending_review"),
    ruleRef: text("rule_ref"),
    matchedMerchantId: bigserial("matched_merchant_id", { mode: "number" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("transactions_dedupe_idx").on(t.orgId, t.accountId, t.externalId),
    index("transactions_org_date_idx").on(t.orgId, t.date),
    index("transactions_org_status_idx").on(t.orgId, t.status),
  ],
);

export const reviewTasks = pgTable(
  "review_tasks",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: text("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
    transactionId: text("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
    reviewerId: text("reviewer_id").references(() => users.id),
    status: varchar("status", { length: 32 }).notNull().default("queued"),
    leasedUntil: timestamp("leased_until"),
    verdict: reviewVerdictEnum("verdict"),
    reclassifiedCategory: text("reclassified_category"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (t) => [
    uniqueIndex("review_tasks_tx_idx").on(t.transactionId),
    index("review_tasks_org_status_idx").on(t.orgId, t.status),
  ],
);

export const closes = pgTable(
  "closes",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: text("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
    period: varchar("period", { length: 7 }).notNull(), // YYYY-MM
    dueDate: date("due_date", { mode: "string" }).notNull(),
    status: closeStatusEnum("status").notNull().default("open"),
    signedOffBy: text("signed_off_by").references(() => users.id),
    signedOffAt: timestamp("signed_off_at"),
    slaMet: boolean("sla_met"),
    creditIssued: boolean("credit_issued").notNull().default(false),
    clientAck: varchar("client_ack", { length: 16 }), // ok | looks_off
    clientAckAt: timestamp("client_ack_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("closes_org_period_idx").on(t.orgId, t.period), index("closes_org_status_idx").on(t.orgId, t.status)],
);

export const documents = pgTable(
  "documents",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: text("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 32 }).notNull().default("receipt"),
    storageKey: text("storage_key"),
    filename: text("filename").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull().default(0),
    status: docStatusEnum("status").notNull().default("uploaded"),
    uploadedBy: text("uploaded_by").references(() => users.id),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("documents_org_idx").on(t.orgId)],
);

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: text("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  plan: planEnum("plan").notNull().default("essential"),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  currentPeriodEnd: timestamp("current_period_end"),
  demo: boolean("demo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const referralPartners = pgTable(
  "referral_partners",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: text("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
    partnerId: text("partner_id").references(() => users.id),
    partnerName: text("partner_name"),
    revenueSharePct: integer("revenue_share_pct").notNull().default(20),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("referral_partners_org_idx").on(t.orgId)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: text("org_id"),
    actorId: text("actor_id"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    before: jsonb("before").$type<Record<string, unknown>>(),
    after: jsonb("after").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("audit_log_org_idx").on(t.orgId), index("audit_log_created_idx").on(t.createdAt)],
);

export const demoOtps = pgTable(
  "demo_otps",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    email: text("email").notNull(),
    code: text("code").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    consumed: boolean("consumed").notNull().default(false),
  },
  (t) => [index("demo_otps_email_idx").on(t.email)],
);

export type Org = typeof orgs.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Close = typeof closes.$inferSelect;

export const rateLimits = pgTable(
  "rate_limit",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    key: text("key").notNull().unique(),
    count: integer("count").notNull().default(1),
    lastRequest: bigint("last_request", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("rate_limit_key_idx").on(t.key)],
);
