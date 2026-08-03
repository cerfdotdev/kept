"use client";

import { useState, useTransition } from "react";
import { flagLooksOff } from "@/lib/actions";

export function LooksOffButton({ transactionId, flagged }: { transactionId: string; flagged: boolean }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(flagged);

  const onClick = () => {
    startTransition(async () => {
      const res = await flagLooksOff(transactionId);
      if (res.ok) setDone(true);
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending || done}
      className={
        done
          ? "rounded-full border border-amber/50 bg-amber/10 px-3 py-1 font-mono-label text-[11px] text-amber-deep"
          : "rounded-full border border-line px-3 py-1 font-mono-label text-[11px] text-ink-soft hover:border-amber-deep hover:text-amber-deep"
      }
    >
      {done ? "Flagged for review" : pending ? "…" : "Looks off"}
    </button>
  );
}
