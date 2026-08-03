"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap-client";

export function Preloader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      onDone();
      return;
    }
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          gsap.to(el, { autoAlpha: 0, duration: 0.45, ease: "power2.out", onComplete: onDone });
        },
      });
      tl.fromTo(
        "[data-pre-name]",
        { yPercent: 110, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.7, ease: "power3.out" },
      )
        .fromTo(
          "[data-pre-sub]",
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
          0.35,
        )
        .to("[data-pre-stamp]", { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)" }, 0.5)
        .to(el, { autoAlpha: 0, duration: 0.45, ease: "power2.in" }, 1.15);
    }, el);
    return () => ctx.revert();
  }, [onDone]);

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-cream"
      aria-hidden="true"
    >
      <div className="relative flex items-center gap-4">
        <div
          data-pre-stamp
          className="flex h-12 w-12 scale-0 items-center justify-center rounded-full border-2 border-amber opacity-0"
        >
          <span className="font-display text-lg text-ink">K</span>
        </div>
        <span
          data-pre-name
          className="font-display text-5xl tracking-tight text-ink md:text-6xl"
        >
          Kept
        </span>
      </div>
      <span data-pre-sub className="eyebrow mt-4 opacity-0">
        Ledgerfolk
      </span>
    </div>
  );
}
