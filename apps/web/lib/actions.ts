"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, schema, eq, and, sql, desc, asc } from "@/lib/db";
import { createOrgWithDemo, getOrgForUser, requireUser, logAudit } from "@/lib/org";
import { TIERS, type PlanId } from "@/lib/utils";
import { headers } from "next/headers";

async function sessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return requireUser(session);
}

async function orgContext() {
  const user = await sessionUser();
  const org = await getOrgForUser(user.id);
  if (!org) throw new Error("NO_ORG");
  return { user, org };
}

const zodErr = (e: unknown): string =>
  e instanceof z.ZodError ? e.issues[0]?.message ?? "Invalid input" : "Something went wrong";

/* ---------------- onboarding ---------------- */

const onboardingSchema = z.object({
  businessName: z.string().min(1).max(120),
  businessType: z.enum(["trades", "ecommerce", "agency", "freelance"]),
  monthlyVolume: z.enum(["under-100", "100-500", "500-plus"]),
});

export async function onboardOrg(input: unknown) {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { error: zodErr(parsed.error) };

  try {
    const user = await sessionUser();
    const existing = await getOrgForUser(user.id);
    if (existing) return { error: "You already have a business set up." };

    const orgId = await createOrgWithDemo(user);
    await db
      .update(schema.orgs)
      .set({
        name: parsed.data.businessName,
        onboardedAt: new Date(),
        settings: {
          businessType: parsed.data.businessType,
          monthlyVolume: parsed.data.monthlyVolume,
          demo: true,
        },
      })
      .where(eq(schema.orgs.id, orgId));
    await logAudit({ orgId, actorId: user.id, action: "org.onboarded", entity: "org", entityId: orgId });
    revalidatePath("/dashboard");
    redirect("/dashboard");
  } catch (e) {
    return { error: zodErr(e) };
  }
}

/* ---------------- transactions ---------------- */

export async function flagLooksOff(transactionId: string) {
  const { user, org } = await orgContext();
  const tx = await db
    .select({ id: schema.transactions.id, status: schema.transactions.status })
    .from(schema.transactions)
    .where(and(eq(schema.transactions.id, transactionId), eq(schema.transactions.orgId, org.org.id)))
    .limit(1);
  if (tx.length === 0) return { error: "Transaction not found" };

  if (tx[0].status === "auto") {
    await db
      .update(schema.transactions)
      .set({ status: "pending_review", confidence: "0.5" })
      .where(eq(schema.transactions.id, transactionId));
    await db
      .insert(schema.reviewTasks)
      .values({
        orgId: org.org.id,
        transactionId,
        status: "queued",
        notes: "Client flagged this as looks-off",
      })
      .onConflictDoNothing();
  }
  await logAudit({
    orgId: org.org.id,
    actorId: user.id,
    action: "tx.looks_off",
    entity: "transaction",
    entityId: transactionId,
  });
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return { ok: true };
}

/* ---------------- closes ---------------- */

export async function acknowledgeClose(period: string, ack: "ok" | "looks_off") {
  const { user, org } = await orgContext();
  await db
    .update(schema.closes)
    .set({ clientAck: ack, clientAckAt: new Date() })
    .where(and(eq(schema.closes.orgId, org.org.id), eq(schema.closes.period, period)));
  if (ack === "looks_off") {
    await db
      .update(schema.closes)
      .set({ status: "in_review" })
      .where(and(eq(schema.closes.orgId, org.org.id), eq(schema.closes.period, period)));
  }
  await logAudit({
    orgId: org.org.id,
    actorId: user.id,
    action: `close.${ack}`,
    entity: "close",
    entityId: period,
  });
  revalidatePath("/close");
  return { ok: true };
}

/* ---------------- reviewer workspace ---------------- */

export async function reviewVerdict(input: {
  taskId: string;
  verdict: "approve" | "reclassify" | "uncertain";
  category?: string;
  notes?: string;
}) {
  const { user, org } = await orgContext();
  if (!["owner", "admin"].includes(org.role)) return { error: "Forbidden" };

  const task = await db
    .select({ id: schema.reviewTasks.id, transactionId: schema.reviewTasks.transactionId, orgId: schema.reviewTasks.orgId })
    .from(schema.reviewTasks)
    .where(and(eq(schema.reviewTasks.id, input.taskId), eq(schema.reviewTasks.orgId, org.org.id)))
    .limit(1);
  if (task.length === 0) return { error: "Task not found" };

  const txId = task[0].transactionId;
  const wasAuto = (await db
    .select({ status: schema.transactions.status })
    .from(schema.transactions)
    .where(eq(schema.transactions.id, txId))
    .limit(1))[0]?.status;

  if (input.verdict === "approve") {
    await db
      .update(schema.transactions)
      .set({ status: "approved" })
      .where(eq(schema.transactions.id, txId));
  } else if (input.verdict === "reclassify" && input.category) {
    await db
      .update(schema.transactions)
      .set({ status: "reclassified", category: input.category, confidence: "0.99" })
      .where(eq(schema.transactions.id, txId));
    // feedback loop: remember the corrected merchant mapping
    const tx = await db
      .select({ description: schema.transactions.description })
      .from(schema.transactions)
      .where(eq(schema.transactions.id, txId))
      .limit(1);
    if (tx[0]) {
      await db
        .insert(schema.merchants)
        .values({
          orgId: org.org.id,
          normalizedName: tx[0].description.toLowerCase().replace(/\s+/g, " ").trim(),
          displayName: tx[0].description,
          category: input.category,
          pattern: null,
        })
        .onConflictDoNothing();
    }
  } else {
    await db
      .update(schema.transactions)
      .set({ status: "pending_review", confidence: "0.3" })
      .where(eq(schema.transactions.id, txId));
  }

  await db
    .update(schema.reviewTasks)
    .set({
      status: "done",
      verdict: input.verdict,
      reclassifiedCategory: input.verdict === "reclassify" ? input.category : null,
      notes: input.notes ?? null,
      reviewerId: user.id,
      completedAt: new Date(),
    })
    .where(eq(schema.reviewTasks.id, input.taskId));

  if (wasAuto === "auto" && input.verdict === "reclassify") {
    await db
      .update(schema.transactions)
      .set({ status: "reclassified", confidence: "0.99" })
      .where(eq(schema.transactions.id, txId));
  }

  await logAudit({
    orgId: org.org.id,
    actorId: user.id,
    action: `review.${input.verdict}`,
    entity: "review_task",
    entityId: input.taskId,
  });
  revalidatePath("/workspace");
  return { ok: true };
}

export async function signOffClose(period: string, notes?: string) {
  const { user, org } = await orgContext();
  if (!["owner", "admin"].includes(org.role)) return { error: "Forbidden" };

  const close = await db
    .select({ id: schema.closes.id, dueDate: schema.closes.dueDate, status: schema.closes.status })
    .from(schema.closes)
    .where(and(eq(schema.closes.orgId, org.org.id), eq(schema.closes.period, period)))
    .limit(1);
  if (close.length === 0) return { error: "Close not found" };
  if (close[0].status === "done" || close[0].status === "amended") return { error: "Already closed" };

  const now = new Date();
  const slaMet = now.toISOString().slice(0, 10) <= close[0].dueDate;
  await db
    .update(schema.closes)
    .set({
      status: "done",
      signedOffBy: user.id,
      signedOffAt: now,
      slaMet,
      notes: notes ?? null,
    })
    .where(eq(schema.closes.id, close[0].id));

  await logAudit({
    orgId: org.org.id,
    actorId: user.id,
    action: "close.signed_off",
    entity: "close",
    entityId: period,
    after: { slaMet },
  });
  revalidatePath("/workspace");
  revalidatePath("/close");
  return { ok: true };
}

/* ---------------- documents ---------------- */

const uploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mime: z.string().min(1),
  size: z.number().int().min(0).max(25 * 1024 * 1024),
  contentBase64: z.string().min(1),
});

export async function uploadDocument(input: unknown) {
  const parsed = uploadSchema.safeParse(input);
  if (!parsed.success) return { error: zodErr(parsed.error) };
  const { user, org } = await orgContext();

  const dir = process.env.UPLOAD_DIR ?? "/uploads";
  const key = `${org.org.id}/${Date.now()}-${parsed.data.filename.replace(/[^\w.\-]/g, "_")}`;
  const { mkdirSync, writeFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  mkdirSync(join(dir, org.org.id), { recursive: true });
  writeFileSync(join(dir, key), Buffer.from(parsed.data.contentBase64, "base64"));

  await db.insert(schema.documents).values({
    orgId: org.org.id,
    kind: "receipt",
    storageKey: key,
    filename: parsed.data.filename,
    mime: parsed.data.mime,
    size: parsed.data.size,
    status: "processed",
    uploadedBy: user.id,
    metadata: { origin: "upload" },
  });
  await logAudit({
    orgId: org.org.id,
    actorId: user.id,
    action: "doc.uploaded",
    entity: "document",
    entityId: key,
  });
  revalidatePath("/documents");
  return { ok: true };
}

/* ---------------- export ---------------- */

export async function exportCsv(): Promise<{ filename: string; csv: string } | { error: string }> {
  const { org } = await orgContext();
  const txs = await db
    .select({
      date: schema.transactions.date,
      description: schema.transactions.description,
      category: schema.transactions.category,
      amount: schema.transactions.amount,
      status: schema.transactions.status,
    })
    .from(schema.transactions)
    .where(eq(schema.transactions.orgId, org.org.id))
    .orderBy(asc(schema.transactions.date));
  const csv = [
    "date,description,category,amount,status",
    ...txs.map((t) =>
      [t.date, `"${t.description.replace(/"/g, '""')}"`, t.category, t.amount, t.status].join(","),
    ),
  ].join("\n");
  return { filename: `kept-${org.org.slug}-${new Date().toISOString().slice(0, 10)}.csv`, csv };
}

export async function exportQbo(): Promise<{ filename: string; csv: string } | { error: string }> {
  const { org } = await orgContext();
  const txs = await db
    .select({
      date: schema.transactions.date,
      description: schema.transactions.description,
      category: schema.transactions.category,
      amount: schema.transactions.amount,
    })
    .from(schema.transactions)
    .where(eq(schema.transactions.orgId, org.org.id))
    .orderBy(asc(schema.transactions.date));
  const csv = [
    "Date,Description,Category,Amount",
    ...txs.map((t: { date: string; description: string; category: string; amount: string }) => [t.date, `"${t.description.replace(/"/g, '""')}"`, t.category, t.amount].join(",")),
  ].join("\n");
  return { filename: `kept-${org.org.slug}-qbo-${new Date().toISOString().slice(0, 10)}.csv`, csv };
}

/* ---------------- billing ---------------- */

export async function createCheckout(plan: PlanId): Promise<{ url?: string; ok?: boolean; error?: string }> {
  const { user, org } = await orgContext();
  const tier = TIERS.find((t) => t.id === plan);
  if (!tier) return { error: "Unknown plan" };

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    // demo mode: simulate an active subscription
    await db
      .update(schema.subscriptions)
      .set({
        plan,
        status: "active",
        demo: true,
        currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
      })
      .where(eq(schema.subscriptions.orgId, org.org.id));
    await db.update(schema.orgs).set({ plan }).where(eq(schema.orgs.id, org.org.id));
    await logAudit({
      orgId: org.org.id,
      actorId: user.id,
      action: "billing.demo_upgrade",
      entity: "subscription",
      after: { plan },
    });
    revalidatePath("/billing");
    return { ok: true };
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(stripeKey);
  const sub = await db
    .select({ stripeCustomerId: schema.subscriptions.stripeCustomerId })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.orgId, org.org.id))
    .limit(1);

  let customerId = sub[0]?.stripeCustomerId ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, name: org.org.name, metadata: { orgId: org.org.id } });
    customerId = customer.id;
    await db
      .update(schema.subscriptions)
      .set({ stripeCustomerId: customerId })
      .where(eq(schema.subscriptions.orgId, org.org.id));
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env[`STRIPE_PRICE_${plan.toUpperCase()}`] ?? "", quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?checkout=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?checkout=cancelled`,
    metadata: { orgId: org.org.id },
  });
  return { url: session.url ?? undefined };
}

export async function cancelSubscription() {
  const { user, org } = await orgContext();
  const sub = await db
    .select({ stripeSubscriptionId: schema.subscriptions.stripeSubscriptionId })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.orgId, org.org.id))
    .limit(1);
  if (!sub[0]?.stripeSubscriptionId) {
    await db
      .update(schema.subscriptions)
      .set({ status: "canceled" })
      .where(eq(schema.subscriptions.orgId, org.org.id));
  } else {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    await stripe.subscriptions.cancel(sub[0].stripeSubscriptionId);
  }
  await logAudit({
    orgId: org.org.id,
    actorId: user.id,
    action: "billing.canceled",
    entity: "subscription",
  });
  revalidatePath("/billing");
  return { ok: true };
}

/* ---------------- settings ---------------- */

const profileSchema = z.object({
  name: z.string().min(1).max(120),
  businessType: z.enum(["trades", "ecommerce", "agency", "freelance"]),
});

export async function updateProfile(input: unknown) {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { error: zodErr(parsed.error) };
  const { user, org } = await orgContext();
  const settings = { ...(org.org.settings ?? {}), businessType: parsed.data.businessType };
  await db
    .update(schema.orgs)
    .set({ name: parsed.data.name, settings })
    .where(eq(schema.orgs.id, org.org.id));
  await logAudit({
    orgId: org.org.id,
    actorId: user.id,
    action: "org.profile_updated",
    entity: "org",
    entityId: org.org.id,
  });
  revalidatePath("/settings");
  return { ok: true };
}

export async function requestFullExport() {
  const { user, org } = await orgContext();
  await logAudit({
    orgId: org.org.id,
    actorId: user.id,
    action: "export.requested",
    entity: "org",
    entityId: org.org.id,
  });
  return { ok: true };
}
