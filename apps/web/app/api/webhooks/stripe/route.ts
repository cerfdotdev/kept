import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { db, schema, eq } from "@/lib/db";

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const body = await request.text();

  // Demo mode: no Stripe configured — ignore gracefully.
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ received: true, demo: true });
  }

  const { default: StripeCtor } = await import("stripe");
  const stripe = new StripeCtor(process.env.STRIPE_SECRET_KEY!);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, request.headers.get("stripe-signature") ?? "", secret);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const updateByCustomer = async (customerId: string, patch: Record<string, unknown>) => {
    await db
      .update(schema.subscriptions)
      .set(patch)
      .where(eq(schema.subscriptions.stripeCustomerId, customerId));
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const plan = (session.metadata?.plan ?? "essential") as typeof schema.subscriptions.$inferSelect.plan;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      if (customerId) {
        await updateByCustomer(customerId, {
          plan,
          status: "active",
          demo: false,
          stripeSubscriptionId: subscriptionId ?? undefined,
          currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
        });
        if (session.metadata?.orgId) {
          await db.update(schema.orgs).set({ plan }).where(eq(schema.orgs.id, session.metadata.orgId));
        }
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      if (sub.customer) {
        const status = (event.type.endsWith("deleted") ? "canceled" : sub.status) as
          | "trialing"
          | "active"
          | "past_due"
          | "canceled"
          | "incomplete";
        const periodEndRaw = (sub as unknown as { current_period_end?: number }).current_period_end;
        await updateByCustomer(sub.customer as string, {
          status,
          currentPeriodEnd: periodEndRaw ? new Date(periodEndRaw * 1000) : undefined,
        });
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
