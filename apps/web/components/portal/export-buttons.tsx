"use client";

import { useTransition } from "react";
import { exportCsv, exportQbo } from "@/lib/actions";

export function ExportButtons({ kind }: { kind: "csv" | "qbo" }) {
  const [pending, startTransition] = useTransition();

  const download = () => {
    startTransition(async () => {
      const res = kind === "csv" ? await exportCsv() : await exportQbo();
      if ("error" in res) return;
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <button onClick={download} disabled={pending} className="btn-secondary text-sm">
      {pending ? "Preparing…" : kind === "csv" ? "Download CSV" : "Download QBO"}
    </button>
  );
}
