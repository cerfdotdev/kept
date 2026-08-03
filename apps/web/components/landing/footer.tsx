import Link from "next/link";

const COLUMNS: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#how" },
      { label: "Pricing", href: "#pricing" },
      { label: "The Kept Promise", href: "#promise" },
      { label: "Live demo", href: "/auth/signin" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Why we exist", href: "#why" },
      { label: "Contact", href: "mailto:hello@kept.dok.cerf.codes" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-cream-dark/80">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink">
                <span className="font-display text-sm text-ink">K</span>
              </span>
              <span className="font-display text-xl text-ink">Kept</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">
              Done-for-you bookkeeping with a named human on every close. Your data is yours —
              always.
            </p>
            <p className="mt-6 font-mono-label text-xs text-ink-soft">Ledgerfolk, Inc.</p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="eyebrow mb-4">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-ink hover:text-amber-deep">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <p className="font-mono-label text-xs text-ink-soft">© 2026 Ledgerfolk. Your books, kept.</p>
          <p className="font-mono-label text-xs text-ink-soft">
            Closed on time. By a named human. Every month.
          </p>
        </div>
      </div>
    </footer>
  );
}
