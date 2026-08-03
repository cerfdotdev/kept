"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap-client";
import { THE_KEPT_PROMISE } from "@/lib/utils";

const COUNTERS: Array<{ value: number; decimals: number; suffix: string; label: string }> = [
  { value: 5, decimals: 0, suffix: "", label: "business day — your close, guaranteed" },
  { value: 8.02, decimals: 2, suffix: "am", label: "the email lands, on the dot" },
  { value: 100, decimals: 0, suffix: "%", label: "of your data, exportable anytime" },
  { value: 0, decimals: 0, suffix: "", label: "auto-renewal traps. Ever." },
];

function Icon({ i }: { i: number }) {
  const common = { className: "h-6 w-6 text-amber", "aria-hidden": true } as const;
  switch (i) {
    case 0:
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12l2.5 2.5L16 9.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 1:
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 2:
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 3l8 4v5c0 4.5-3.2 7.6-8 9-4.8-1.4-8-4.5-8-9V7l8-4z" strokeLinejoin="round" />
          <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

export function PromiseSection() {
  const root = useRef<HTMLElement>(null);
  const countersRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      gsap.set(el.querySelectorAll("[data-reveal]"), { opacity: 1, y: 0 });
      countersRef.current?.querySelectorAll("[data-count]").forEach((n) => {
        n.textContent = "5 / 8:02 / 100 / 0";
      });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((card) => {
        gsap.fromTo(
          card,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: card, start: "top 88%", once: true },
          },
        );
      });

      countersRef.current?.querySelectorAll("[data-counter]").forEach((c) => {
        const target = Number(c.getAttribute("data-counter"));
        const decimals = Number(c.getAttribute("data-decimals") ?? "0");
        const suffix = c.getAttribute("data-suffix") ?? "";
        gsap.fromTo(
          c,
          { innerText: 0 },
          {
            innerText: target,
            duration: 1.6,
            ease: "power2.out",
            snap: { innerText: 10 ** -decimals },
            scrollTrigger: { trigger: c, start: "top 88%", once: true },
            onUpdate() {
              c.textContent = `${Number(c.textContent).toFixed(decimals)}${suffix}`;
            },
          },
        );
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} id="promise" className="section-pad">
      <div className="mx-auto max-w-6xl px-6">
        <p className="eyebrow mb-4">The Kept Promise</p>
        <h2 className="font-display max-w-2xl text-4xl leading-tight text-ink md:text-5xl">
          Four things we&apos;ll never trade away.
        </h2>

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {THE_KEPT_PROMISE.map((p, i) => (
            <div key={p} data-reveal className="card flex items-start gap-4 p-7">
              <span className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-amber/40 bg-amber/10">
                <Icon i={i} />
              </span>
              <p className="pt-2 text-lg leading-relaxed text-ink">{p}</p>
            </div>
          ))}
        </div>

        <div ref={countersRef} className="mt-16 grid gap-8 rounded-2xl border border-line bg-cream-light p-10 sm:grid-cols-2 md:grid-cols-4">
          {COUNTERS.map((c) => (
            <div key={c.label} data-reveal>
              <p className="font-display text-5xl text-ink">
                <span data-counter={c.value} data-decimals={c.decimals} data-suffix={c.suffix}>
                  {c.value.toFixed(c.decimals)}
                  {c.suffix}
                </span>
              </p>
              <p className="mt-2 font-mono-label text-xs leading-relaxed text-ink-soft">{c.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
