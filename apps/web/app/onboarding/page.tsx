"use client";

import { useState } from "react";
import Link from "next/link";
import { onboardOrg } from "@/lib/actions";

const TYPES = [
  { id: "trades", label: "Trades & home services" },
  { id: "ecommerce", label: "E-commerce" },
  { id: "agency", label: "Agency / studio" },
  { id: "freelance", label: "Freelance / solo" },
] as const;

export default function OnboardingPage() {
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<"trades" | "ecommerce" | "agency" | "freelance">("trades");
  const [monthlyVolume, setMonthlyVolume] = useState<"under-100" | "100-500" | "500-plus">("100-500");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await onboardOrg({ businessName, businessType, monthlyVolume });
    if (res?.error) {
      setError(res.error);
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg">
        <Link href="/" className="mb-10 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink">
            <span className="font-display text-sm text-ink">K</span>
          </span>
          <span className="font-display text-2xl text-ink">Kept</span>
        </Link>

        <div className="card p-8">
          <h1 className="font-display text-3xl text-ink">Set up your books</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Three quick questions. Your reviewer will take it from here — first close within 30
            days, guaranteed.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-6">
            <label className="block">
              <span className="mb-1.5 block font-mono-label text-xs uppercase tracking-wider text-ink-soft">
                Business name
              </span>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Acme Plumbing & Heating"
                className="w-full rounded-lg border border-line bg-cream-light px-4 py-3 text-ink outline-none focus:border-ink"
              />
            </label>

            <fieldset>
              <legend className="mb-2 font-mono-label text-xs uppercase tracking-wider text-ink-soft">
                What do you do?
              </legend>
              <div className="grid gap-2">
                {TYPES.map((t) => (
                  <label
                    key={t.id}
                    className={[
                      "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm",
                      businessType === t.id ? "border-ink bg-ink text-cream" : "border-line bg-cream-light text-ink",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name="type"
                      className="sr-only"
                      checked={businessType === t.id}
                      onChange={() => setBusinessType(t.id)}
                    />
                    {t.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 font-mono-label text-xs uppercase tracking-wider text-ink-soft">
                Monthly transactions
              </legend>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["under-100", "Under 100"],
                    ["100-500", "100–500"],
                    ["500-plus", "500+"],
                  ] as const
                ).map(([id, label]) => (
                  <label
                    key={id}
                    className={[
                      "cursor-pointer rounded-full border px-4 py-2 text-sm",
                      monthlyVolume === id ? "border-amber-deep bg-amber/15 text-amber-deep" : "border-line text-ink",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name="volume"
                      className="sr-only"
                      checked={monthlyVolume === id}
                      onChange={() => setMonthlyVolume(id)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            {error && <p className="text-sm text-red-700">{error}</p>}

            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? "Setting up…" : "Start my first close"}
            </button>
            <p className="text-center font-mono-label text-[11px] text-ink-soft">
              Free 14-day pilot · No card required
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
