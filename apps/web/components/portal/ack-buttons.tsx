"use client";

import { useTransition } from "react";
import { acknowledgeClose } from "@/lib/actions";

export function AckButtons({ period, ack }: { period: string; ack: string | null }) {
  const [pending, startTransition] = useTransition();

  const ackIt = (value: "ok" | "looks_off") => {
    startTransition(async () => {
      await acknowledgeClose(period, value);
    });
  };

  return (
    <>
      <button onClick={() => ackIt("ok")} disabled={pending} className="btn-primary">
        Looks right
      </button>
      <button
        onClick={() => ackIt("looks_off")}
        disabled={pending}
        className="btn-secondary"
      >
        Something&apos;s off
      </button>
    </>
  );
}
