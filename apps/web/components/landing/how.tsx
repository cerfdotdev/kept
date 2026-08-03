"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap-client";

const STEPS = [
  {
    n: "01",
    label: "Connect",
    title: "We do the importing",
    body: "Link your bank accounts and drop in your receipts. Our team imports and cleans up the past — including three messy months on Growth and Pro.",
  },
  {
    n: "02",
    label: "We keep",
    title: "Sorted quietly, checked by a person",
    body: "The engine classifies every transaction in the background. Before anything is official, a named, credentialed reviewer goes through it line by line and signs the close.",
  },
  {
    n: "03",
    label: "You sign",
    title: "One \u201cLooks right\u201d a month",
    body: "Your books land in your inbox, closed and explained. Anything that looks off gets fixed — never silent, never after tax season.",
  },
];

export function How() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      gsap.set(el.querySelectorAll("[data-step]"), { opacity: 1, y: 0 });
      return;
    }
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-step]").forEach((card, i) => {
        gsap.fromTo(
          card,
          { opacity: 0, y: 48 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            delay: i * 0.08,
            scrollTrigger: { trigger: card, start: "top 85%", once: true },
          },
        );
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} id="how" className="section-pad bg-cream-dark/60">
      <div className="mx-auto max-w-6xl px-6">
        <p className="eyebrow mb-4">How it works</p>
        <h2 className="font-display max-w-2xl text-4xl leading-tight text-ink md:text-5xl">
          Three small rituals.
          <br />
          Zero bookkeeping.
        </h2>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} data-step className="card flex flex-col gap-5 p-8">
              <div className="flex items-baseline justify-between">
                <span className="font-display text-5xl text-ink">{s.n}</span>
                <span className="font-mono-label text-xs text-amber-deep">{s.label}</span>
              </div>
              <h3 className="font-display text-2xl text-ink">{s.title}</h3>
              <p className="leading-relaxed text-ink-soft">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
