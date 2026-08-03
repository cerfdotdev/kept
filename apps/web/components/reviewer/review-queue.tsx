"use client";

import { useState, useTransition } from "react";
import { reviewVerdict } from "@/lib/actions";
import { formatMoney, CATEGORY_LABELS } from "@/lib/utils";

interface QueueTx {
  id: string;
  transactionId: string;
  notes: string | null;
  createdAt: Date;
  tx: {
    description: string;
    amount: string;
    date: string;
    category: string;
    confidence: string;
    status: string;
  };
}

export function ReviewQueue({ tasks, categories }: { tasks: QueueTx[]; categories: string[] }) {
  const [pending, startTransition] = useTransition();

  const decide = (taskId: string, verdict: "approve" | "reclassify" | "uncertain", category?: string, notes?: string) => {
    startTransition(async () => {
      await reviewVerdict({ taskId, verdict, category, notes });
    });
  };

  if (tasks.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="font-display text-xl text-ink">Queue is clear.</p>
        <p className="mt-2 text-sm text-ink-soft">
          Every transaction has been sorted. The close is ready for sign-off.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((t) => {
        const amount = Number(t.tx.amount);
        return (
          <div key={t.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-ink">{t.tx.description}</p>
                <p className="mt-0.5 font-mono-label text-xs text-ink-soft">
                  {t.tx.date} · suggested: {CATEGORY_LABELS[t.tx.category] ?? t.tx.category} · confidence{" "}
                  {Math.round(Number(t.tx.confidence) * 100)}%
                </p>
                {t.notes && <p className="mt-1.5 text-xs italic text-amber-deep">{t.notes}</p>}
              </div>
              <p className={`font-display text-xl ${amount < 0 ? "text-ink" : "text-signal"}`}>{formatMoney(t.tx.amount)}</p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <select
                id={`cat-${t.id}`}
                defaultValue={t.tx.category}
                className="rounded-lg border border-line bg-cream-light px-3 py-2 text-sm text-ink outline-none focus:border-ink"
                aria-label="Reclassify to"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c] ?? c}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={pending}
                onClick={() => decide(t.id, "approve")}
                className="btn-primary !px-4 !py-2 text-sm"
              >
                Looks right
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  const sel = document.getElementById(`cat-${t.id}`) as HTMLSelectElement | null;
                  decide(t.id, "reclassify", sel?.value);
                }}
                className="btn-secondary !px-4 !py-2 text-sm"
              >
                Reclassify
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => decide(t.id, "uncertain")}
                className="rounded-full border border-line px-4 py-2 text-sm text-ink-soft hover:text-amber-deep"
              >
                Needs research
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
