"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/transactions", label: "Transactions" },
  { href: "/close", label: "This month" },
  { href: "/documents", label: "Documents" },
  { href: "/billing", label: "Plan" },
  { href: "/export", label: "Your data" },
  { href: "/settings", label: "Settings" },
  { href: "/workspace", label: "Reviewer desk" },
];

export function PortalShell({
  user,
  orgName,
  orgId,
  plan,
  role,
  children,
}: {
  user: { name: string; email: string };
  orgName: string;
  orgId: string;
  plan: string;
  role: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    await authClient.signOut();
    window.location.href = "/";
  };

  return (
    <div className="app-surface flex min-h-screen flex-col lg:flex-row">
      <aside className="border-b border-line bg-cream-light lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink">
              <span className="font-display text-sm text-ink">K</span>
            </span>
            <span className="font-display text-lg text-ink">Kept</span>
          </Link>
          <button
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Toggle menu"
          >
            Menu
          </button>
        </div>
        <nav className={cn("px-3 pb-4 lg:block", open ? "block" : "hidden")} aria-label="Main">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "mb-1 block rounded-lg px-3 py-2 text-sm transition-colors",
                  active ? "bg-ink text-cream" : "text-ink hover:bg-cream-dark",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto hidden border-t border-line px-5 py-4 lg:block">
          <p className="truncate text-sm font-medium text-ink">{user.name}</p>
          <p className="truncate font-mono-label text-xs text-ink-soft">{user.email}</p>
          <p className="mt-2 font-mono-label text-[11px] uppercase tracking-wider text-amber-deep">
            {plan} · {role}
          </p>
          <button onClick={signOut} className="mt-3 text-sm text-ink-soft underline-offset-2 hover:underline">
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">{children}</div>
      </main>
    </div>
  );
}
