"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { gsap, ScrollTrigger, SplitText, prefersReducedMotion } from "@/lib/gsap-client";

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      gsap.set(el.querySelectorAll("[data-reveal]"), { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      const headline = el.querySelector("[data-headline]") as HTMLElement | null;
      if (headline) {
        const split = new SplitText(headline, { type: "lines", mask: "lines" });
        gsap.fromTo(
          split.lines,
          { yPercent: 110 },
          { yPercent: 0, duration: 1.1, ease: "power4.out", stagger: 0.12, delay: 0.15 },
        );
      }
      gsap.fromTo(
        el.querySelectorAll("[data-reveal]"),
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.12, delay: 0.7 },
      );
      gsap.fromTo(
        "[data-orbit]",
        { scale: 0.6, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1.6, ease: "power3.out", delay: 0.4 },
      );
      gsap.to("[data-scroll-hint]", {
        opacity: 0,
        y: -14,
        scrollTrigger: { trigger: el, start: "top top", end: "bottom 60%", scrub: true },
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <header ref={root} className="relative flex min-h-screen flex-col overflow-hidden">
      <div data-orbit className="pointer-events-none absolute -right-40 top-1/4 h-[34rem] w-[34rem] rounded-full border border-ink/10" />
      <div data-orbit className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-amber/15 blur-2xl" />

      <nav className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <Link href="/" className="flex items-center gap-2" data-cursor="hover">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink">
            <span className="font-display text-sm text-ink">K</span>
          </span>
          <span className="font-display text-xl text-ink">Kept</span>
          <span className="eyebrow hidden sm:inline">by Ledgerfolk</span>
        </Link>
        <div className="flex items-center gap-5">
          <Link href="/auth/signin" className="eyebrow hidden text-ink hover:text-ink-deep sm:block" data-cursor="hover">
            Sign in
          </Link>
          <Link href="/auth/signin" className="btn-secondary !px-5 !py-2 text-sm" data-cursor="hover">
            Start free
          </Link>
        </div>
      </nav>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 pb-20 pt-10 md:px-12">
        <p data-reveal className="eyebrow mb-6 opacity-0">
          Bookkeeping for small business — done for you
        </p>

        <h1
          data-headline
          className="font-display max-w-4xl text-[clamp(3rem,8vw,6.5rem)] font-medium leading-[0.98] tracking-tight text-ink"
        >
          Your books,
          <br />
          kept.
        </h1>

        <p data-reveal className="mt-8 max-w-xl text-lg leading-relaxed text-ink-soft opacity-0">
          Closed on time, by a named human, every month. The sorting happens quietly in the
          background. What you see is one clear sign-off — and books you never have to worry about.
        </p>

        <div data-reveal className="mt-10 flex flex-wrap items-center gap-4 opacity-0">
          <a href="#how" className="btn-primary" data-cursor="hover">
            See how it works
          </a>
          <Link href="/auth/signin" className="btn-secondary" data-cursor="hover">
            Try the live demo
          </Link>
        </div>

        <div data-reveal className="mt-14 flex flex-wrap gap-x-10 gap-y-3 opacity-0">
          {[
            ["5th", "business day, every month"],
            ["8:02", "am, on the dot"],
            ["1", "named reviewer, yours"],
          ].map(([n, label]) => (
            <div key={n}>
              <span className="font-display text-3xl text-ink">{n}</span>
              <span className="ml-2 font-mono-label text-xs text-ink-soft">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div data-scroll-hint className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
        <span className="eyebrow block">Scroll</span>
        <span className="mx-auto mt-2 block h-10 w-px bg-ink/30" />
      </div>
    </header>
  );
}
