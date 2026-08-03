"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap-client";

export function CustomCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const narrow = window.innerWidth < 1024;
    if (coarse || narrow || prefersReducedMotion()) return;

    const dotEl = dot.current;
    const ringEl = ring.current;
    if (!dotEl || !ringEl) return;

    const dx = gsap.quickTo(dotEl, "x", { duration: 0.12, ease: "power2.out" });
    const dy = gsap.quickTo(dotEl, "y", { duration: 0.12, ease: "power2.out" });
    const rx = gsap.quickTo(ringEl, "x", { duration: 0.4, ease: "power3.out" });
    const ry = gsap.quickTo(ringEl, "y", { duration: 0.4, ease: "power3.out" });

    const move = (e: MouseEvent) => {
      dx(e.clientX);
      dy(e.clientY);
      rx(e.clientX);
      ry(e.clientY);
    };

    const over = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest?.("[data-cursor]");
      gsap.to(ringEl, {
        scale: target ? 1.9 : 1,
        opacity: target ? 0.9 : 1,
        duration: 0.3,
        ease: "power2.out",
      });
      gsap.to(dotEl, { scale: target ? 0.5 : 1, duration: 0.3 });
    };

    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("mouseover", over, { passive: true });
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", over);
    };
  }, []);

  return (
    <>
      <div
        ref={dot}
        className="pointer-events-none fixed left-0 top-0 z-[90] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink"
        aria-hidden="true"
      />
      <div
        ref={ring}
        className="pointer-events-none fixed left-0 top-0 z-[90] h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink/40"
        aria-hidden="true"
      />
    </>
  );
}
