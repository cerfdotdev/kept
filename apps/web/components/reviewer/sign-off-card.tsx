"use client";

import { useState, useTransition } from "react";
import { signOffClose } from "@/lib/actions";
import { formatDate } from "@/lib/utils";

interface CloseRow {
  period: string;
  dueDate: string;
  status: string;
}

export function SignOffCard({ closes, role }: { closes: CloseRow[]; role: string }) {
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  const sign = (period: string) => {
    startTransition(async () => {
      await signOffClose(period, notes || undefined);
      setNotes("");
    });
  };

  if (closes.length === 0) {
    return (
      <div className="card p-6 text-center text-sm text-ink-soft">
        No open closes. Nice work.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {closes.map((c) => (
        <div key={c.period} className="card p-6">
          <p className="font-display text-2xl text-ink">Period {c.period}</p>
          <p className="mt-1 font-mono-label text-xs text-ink-soft">
            Due {formatDate(c.dueDate)} · status {c.status}
          </p>
          {role === "owner" || role === "admin" ? (
            <>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reviewer notes (optional)"
                rows={2}
                className="mt-4 w-full rounded-lg border border-line bg-cream-light px-4 py-2.5 text-sm text-ink outline-none focus:border-ink"
                aria-label="Sign-off notes"
              />
              <button onClick={() => sign(c.period)} disabled={pending} className="btn-primary mt-3 w-full text-sm">
                {pending ? "Signing…" : "Sign off The Review"}
              </button>
              <p className="mt-3 text-center font-mono-label text-[11px] text-ink-soft">
                Signing certifies the close. SLA met if signed by {formatDate(c.dueDate)}.
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-ink-soft">Only owners and admins can sign off.</p>
          )}
        </div>
      ))}
    </div>
  );
}
