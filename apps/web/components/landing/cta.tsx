"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap-client";

export function Cta() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      gsap.set(el.querySelectorAll("[data-reveal]"), { opacity: 1, y: 0 });
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll("[data-reveal]"),
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          stagger: 0.1,
          scrollTrigger: { trigger: el, start: "top 80%", once: true },
        },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="section-pad">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <p data-reveal className="eyebrow mb-6">
          The first 14 days are on us
        </p>
        <h2 data-reveal className="font-display text-4xl leading-tight text-ink md:text-6xl">
          Try it on your real books.
          <br />
          No card. No fine print.
        </h2>
        <div data-reveal className="mt-10">
          <a href="/auth/signin" className="btn-primary !px-10 !py-4 text-lg" data-cursor="hover">
            Start your free pilot
          </a>
        </div>
        <p data-reveal className="mt-5 font-mono-label text-xs text-ink-soft">
          Free 14-day pilot · No card required · Your data exports any time
        </p>
      </div>
    </section>
  );
}
