"use client";

import { useEffect, useState } from "react";
import { getLenis } from "./gsap-client";

export function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let instance: { destroy: () => void } | null = null;
    let cancelled = false;
    getLenis()
      .then((l) => {
        if (cancelled) l.destroy();
        else instance = l;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      instance?.destroy();
    };
  }, []);

  return <>{children}</>;
}

export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
