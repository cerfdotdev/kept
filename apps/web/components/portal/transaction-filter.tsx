"use client";

import { useRouter } from "next/navigation";

export function TransactionFilter({
  categories,
  currentQ,
  currentCat,
}: {
  categories: string[];
  currentQ: string;
  currentCat: string;
}) {
  const router = useRouter();
  const apply = (q: string, cat: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (cat && cat !== "all") params.set("cat", cat);
    router.push(`/transactions${params.toString() ? `?${params}` : ""}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="search"
        defaultValue={currentQ}
        placeholder="Search descriptions…"
        onKeyDown={(e) => {
          if (e.key === "Enter") apply(e.currentTarget.value, currentCat);
        }}
        className="w-full max-w-xs rounded-lg border border-line bg-cream-light px-4 py-2.5 text-sm text-ink outline-none focus:border-ink"
        aria-label="Search transactions"
      />
      <select
        value={currentCat}
        onChange={(e) => apply(currentQ, e.target.value)}
        className="rounded-lg border border-line bg-cream-light px-4 py-2.5 text-sm text-ink outline-none focus:border-ink"
        aria-label="Filter by category"
      >
        <option value="all">All categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}
