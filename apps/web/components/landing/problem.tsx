"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap-client";

const PARTS = [
  {
    label: "December 27, 2024",
    text: "A popular bookkeeping startup — the one that promised small businesses a modern, handled back office — shut down with almost no notice. Thousands of owners lost access to their own books days before tax season.",
  },
  {
    label: "The pattern",
    text: "It wasn't one mistake. It was the model: software sold as a service, staffed by people trained on the fly, with no real accountability. When the money ran out, the books went dark. The customers were never the point.",
  },
  {
    label: "What small businesses learned",
    text: "That 'handled' can mean 'held hostage.' That a dashboard is not a relationship. That a promise made in a pricing page means nothing at 3pm on a Friday.",
  },
];

export function Problem() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      gsap.set(el.querySelectorAll("[data-reveal]"), { opacity: 1, y: 0 });
      return;
    }
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((part) => {
        gsap.fromTo(
          part,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: { trigger: part, start: "top 80%", once: true },
          },
        );
      });
      gsap.fromTo(
        "[data-pivot]",
        { opacity: 0, scale: 0.96 },
        {
          opacity: 1,
          scale: 1,
          duration: 1.1,
          ease: "power3.out",
          scrollTrigger: { trigger: "[data-pivot]", start: "top 85%", once: true },
        },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} id="why" className="section-pad relative">
      <div className="mx-auto max-w-3xl px-6">
        <p data-reveal className="eyebrow mb-8">
          Why this exists
        </p>
        <h2 data-reveal className="font-display text-4xl leading-tight text-ink md:text-6xl">
          A whole category broke its promise.
          <br />
          <span className="text-ink-soft">We built the one that can&apos;t.</span>
        </h2>

        <div className="mt-16 space-y-14">
          {PARTS.map((p) => (
            <div key={p.label} data-reveal className="grid gap-3 md:grid-cols-[10rem_1fr] md:gap-8">
              <p className="font-mono-label text-xs leading-relaxed text-amber-deep md:pt-1.5">{p.label}</p>
              <p className="max-w-xl text-lg leading-relaxed text-ink-soft">{p.text}</p>
            </div>
          ))}
        </div>

        <div
          data-pivot
          className="mt-20 rounded-2xl border border-ink/20 bg-ink p-10 text-cream md:p-14"
        >
          <p className="font-display text-2xl leading-snug md:text-3xl">
            Kept is built the other way around: the technology does the heavy lifting quietly, a
            named human is accountable for every close, and your data belongs to you — always.
          </p>
          <p className="mt-6 font-mono-label text-xs uppercase tracking-widest text-cream/60">
            That&apos;s the Kept Promise
          </p>
        </div>
      </div>
    </section>
  );
}
