"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

export { gsap, ScrollTrigger, SplitText };

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

let lenisInstance: { destroy: () => void } | null = null;

/**
 * Lazy-init Lenis smooth scroll, wired to GSAP's ticker (official pattern).
 */
export async function getLenis(): Promise<{ destroy: () => void }> {
  if (typeof window === "undefined") throw new Error("lenis is client-only");
  if (lenisInstance) return lenisInstance;

  if (prefersReducedMotion()) {
    lenisInstance = { destroy: () => {} };
    return lenisInstance;
  }

  const Lenis = (await import("lenis")).default;
  const lenis = new Lenis({
    lerp: 0.1,
    smoothWheel: true,
    autoRaf: false,
  });
  lenis.on("scroll", () => ScrollTrigger.update());

  const raf = (time: number) => {
    lenis.raf(time * 1000);
  };
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  lenisInstance = {
    destroy: () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    },
  };
  return lenisInstance;
}
