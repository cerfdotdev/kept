"use client";

import { useState } from "react";
import Link from "next/link";
import { TIERS } from "@/lib/utils";
import { cn } from "@/lib/utils";

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "Is AI doing my books?",
    a: "AI does the heavy lifting behind the scenes — sorting transactions, matching receipts, keeping the busywork out of your way. But a named, credentialed reviewer signs off on every single close. The technology is ours; the accountability is a person.",
  },
  {
    q: "What happens if you miss the close date?",
    a: "It costs us. If your books aren't closed by 8:02am on the 5th business day (3rd on Pro), you get an automatic credit — no forms, no phone calls, no fine print.",
  },
  {
    q: "Is my data locked in?",
    a: "Never. Export your books in one click, any time — CSV, spreadsheet, or QBO. Cancel and keep working with your own files. There is no exit fee, no hostage situation. That's the whole point.",
  },
  {
    q: "What if my books are a mess?",
    a: "That's our favorite kind. We import, clean up, and reconcile the past — up to 3 months of catch-up included on Growth, more as a one-time cleanup on any plan. Your first close lands within 30 days.",
  },
  {
    q: "Do you prepare taxes?",
    a: "We keep your books tax-ready every month, so tax season stops being a rescue mission. Filing is handled by licensed preparers — we'll connect you when the time comes. We stay in our lane, and you stay out of trouble.",
  },
];

export function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="section-pad bg-cream-dark/60">
      <div className="mx-auto max-w-6xl px-6">
        <p className="eyebrow mb-4">Pricing</p>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 className="font-display max-w-xl text-4xl leading-tight text-ink md:text-5xl">
            A flat price. A full promise.
          </h2>
          <div className="flex items-center gap-3">
            <span className={cn("font-mono-label text-xs", !annual ? "text-ink" : "text-ink-soft")}>Monthly</span>
            <button
              type="button"
              role="switch"
              aria-checked={annual}
              aria-label="Toggle annual pricing"
              onClick={() => setAnnual((v) => !v)}
              className="relative h-7 w-14 rounded-full border border-ink/30 bg-cream-light"
            >
              <span
                className={cn(
                  "absolute top-1 h-5 w-5 rounded-full bg-ink transition-transform duration-200",
                  annual ? "translate-x-7" : "translate-x-1",
                )}
              />
            </button>
            <span className={cn("font-mono-label text-xs", annual ? "text-ink" : "text-ink-soft")}>
              Annual <span className="text-amber-deep">−20%</span>
            </span>
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {TIERS.map((tier, i) => {
            const price = annual ? tier.priceAnnual : tier.priceMonthly;
            return (
              <div
                key={tier.id}
                className={cn(
                  "card relative flex flex-col p-8",
                  i === 1 && "border-ink shadow-[0_16px_48px_-20px_rgba(30,77,67,0.4)]",
                )}
              >
                {i === 1 && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber px-3 py-1 font-mono-label text-[10px] font-medium uppercase tracking-widest text-cream">
                    Most popular
                  </span>
                )}
                <h3 className="font-display text-2xl text-ink">{tier.name}</h3>
                <p className="mt-1 text-sm text-ink-soft">{tier.blurb}</p>
                <p className="mt-6 flex items-baseline gap-1">
                  <span className="font-display text-5xl text-ink">${price}</span>
                  <span className="font-mono-label text-xs text-ink-soft">/month{annual ? ", billed annually" : ""}</span>
                </p>
                <ul className="mt-7 flex-1 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[0.95rem] text-ink">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/signin"
                  data-cursor="hover"
                  className={cn("mt-8 w-full", i === 1 ? "btn-primary" : "btn-secondary")}
                >
                  Start free
                </Link>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center font-mono-label text-xs text-ink-soft">
          Every plan includes the Kept Promise. Cancel any time — your data exports instantly.
        </p>

        <div className="mx-auto mt-16 max-w-3xl">
          <h3 className="font-display mb-6 text-2xl text-ink">Fair questions, straight answers</h3>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="card group p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg text-ink">
                  {f.q}
                  <span className="font-mono-label text-amber-deep transition-transform duration-200 group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="mt-4 leading-relaxed text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
