"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: err } = await authClient.signIn.emailOtp({ email });
    setBusy(false);
    if (err) {
      setError(err.message ?? "Could not send the code. Try again.");
      return;
    }
    setStep("otp");
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      try {
        const res = await fetch(`/api/demo/otp?email=${encodeURIComponent(email)}`);
        const data = (await res.json()) as { code?: string };
        if (data.code) setDemoCode(data.code);
      } catch {
        setDemoCode(null);
      }
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: err } = await authClient.signIn.emailOtp({ email, otp });
    setBusy(false);
    if (err) {
      setError(err.message ?? "That code didn't work. Try again.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-10 flex items-center justify-center gap-2" data-cursor="hover">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink">
            <span className="font-display text-sm text-ink">K</span>
          </span>
          <span className="font-display text-2xl text-ink">Kept</span>
        </Link>

        <div className="card p-8">
          {step === "email" ? (
            <form onSubmit={requestCode} className="space-y-5">
              <div>
                <h1 className="font-display text-3xl text-ink">Sign in</h1>
                <p className="mt-2 text-sm text-ink-soft">
                  We&apos;ll email you a one-time code. No passwords, ever.
                </p>
              </div>
              <label className="block">
                <span className="mb-1.5 block font-mono-label text-xs uppercase tracking-wider text-ink-soft">
                  Work email
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourbusiness.com"
                  className="w-full rounded-lg border border-line bg-cream-light px-4 py-3 text-ink outline-none focus:border-ink"
                />
              </label>
              {error && <p className="text-sm text-red-700">{error}</p>}
              <button type="submit" disabled={busy} className="btn-primary w-full">
                {busy ? "Sending…" : "Email me a code"}
              </button>
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-5">
              <div>
                <h1 className="font-display text-3xl text-ink">Check your email</h1>
                <p className="mt-2 text-sm text-ink-soft">
                  Code sent to <span className="font-medium text-ink">{email}</span>. It expires in
                  5 minutes.
                </p>
              </div>
              {demoCode && (
                <div className="rounded-lg border border-amber/50 bg-amber/10 p-4 text-center">
                  <p className="font-mono-label text-[11px] uppercase tracking-widest text-amber-deep">
                    Demo mode — your code
                  </p>
                  <p className="mt-1 font-mono-label text-3xl tracking-[0.4em] text-ink">{demoCode}</p>
                </div>
              )}
              <label className="block">
                <span className="mb-1.5 block font-mono-label text-xs uppercase tracking-wider text-ink-soft">
                  Six-digit code
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-lg border border-line bg-cream-light px-4 py-3 text-center font-mono-label text-2xl tracking-[0.5em] text-ink outline-none focus:border-ink"
                />
              </label>
              {error && <p className="text-sm text-red-700">{error}</p>}
              <button type="submit" disabled={busy} className="btn-primary w-full">
                {busy ? "Checking…" : "Sign in"}
              </button>
              <button
                type="button"
                onClick={() => setStep("email")}
                className="w-full text-center text-sm text-ink-soft hover:text-ink"
              >
                ← Use a different email
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center font-mono-label text-xs text-ink-soft">
          Free 14-day pilot · No card required
        </p>
      </div>
    </main>
  );
}
