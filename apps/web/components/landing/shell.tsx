"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap-client";
import { Preloader } from "./preloader";

export function Shell({ children }: { children: React.ReactNode }) {
  const [done, setDone] = useState(false);
  const content = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (done && !prefersReducedMotion()) {
      gsap.fromTo(
        content.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.6, ease: "power2.out" },
      );
    } else if (done && content.current) {
      gsap.set(content.current, { opacity: 1 });
    }
  }, [done]);

  return (
    <>
      {!done && <Preloader onDone={() => setDone(true)} />}
      <div ref={content} style={{ opacity: done ? undefined : 0 }}>
        {children}
      </div>
    </>
  );
}
