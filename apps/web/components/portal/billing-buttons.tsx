"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCheckout, cancelSubscription } from "@/lib/actions";
import type { PlanId } from "@/lib/utils";

export function CheckoutButton({ plan }: { plan: PlanId }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onClick = () => {
    startTransition(async () => {
      const res = await createCheckout(plan);
      if (res.url) window.location.href = res.url;
      else if (res.ok) router.refresh();
    });
  };

  return (
    <button onClick={onClick} disabled={pending} className="btn-secondary mt-6 w-full text-sm">
      {pending ? "One moment…" : "Switch to this plan"}
    </button>
  );
}

export function CancelButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onClick = () => {
    if (!window.confirm("Cancel your subscription? Your books stay yours — export any time.")) return;
    startTransition(async () => {
      await cancelSubscription();
      router.refresh();
    });
  };

  return (
    <button onClick={onClick} disabled={pending} className="btn-secondary text-sm">
      {pending ? "…" : "Cancel subscription"}
    </button>
  );
}
