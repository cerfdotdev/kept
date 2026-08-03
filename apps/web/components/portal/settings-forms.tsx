"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "@/lib/actions";

export function ProfileForm({ name, businessType }: { name: string; businessType: string }) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateProfile({
        name: String(fd.get("name")),
        businessType: String(fd.get("type")),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block font-mono-label text-xs uppercase tracking-wider text-ink-soft">
          Business name
        </span>
        <input
          name="name"
          defaultValue={name}
          required
          className="w-full rounded-lg border border-line bg-cream-light px-4 py-2.5 text-ink outline-none focus:border-ink"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block font-mono-label text-xs uppercase tracking-wider text-ink-soft">
          Business type
        </span>
        <select
          name="type"
          defaultValue={businessType}
          className="w-full rounded-lg border border-line bg-cream-light px-4 py-2.5 text-ink outline-none focus:border-ink"
        >
          <option value="trades">Trades & home services</option>
          <option value="ecommerce">E-commerce</option>
          <option value="agency">Agency / studio</option>
          <option value="freelance">Freelance / solo</option>
        </select>
      </label>
      <button type="submit" disabled={pending} className="btn-primary text-sm">
        {pending ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
      </button>
    </form>
  );
}

export function DangerZone({ role }: { role: string }) {
  const [confirm, setConfirm] = useState(false);

  if (role !== "owner") return null;
  return (
    <div className="card border-amber/50 p-6">
      <h2 className="font-display text-xl text-ink">Danger zone</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        Leaving is easy, on purpose. Export your books first — you&apos;ll keep full access for 90
        days after cancelling.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <a href="/export" className="btn-secondary text-sm">
          Export everything
        </a>
        <a href="/billing" className="btn-secondary text-sm">
          Manage plan
        </a>
      </div>
      {confirm ? (
        <p className="mt-4 font-mono-label text-xs text-amber-deep">
          Need to close the account? Email hello@kept.dok.cerf.codes — a human replies within 48
          hours.
        </p>
      ) : (
        <button onClick={() => setConfirm(true)} className="mt-4 text-sm text-ink-soft underline underline-offset-2 hover:text-amber-deep">
          Looking to close your account?
        </button>
      )}
    </div>
  );
}
