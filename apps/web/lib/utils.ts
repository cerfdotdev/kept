export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export function formatMoney(centsOrDollars: number | string, isCents = false): string {
  const n = typeof centsOrDollars === "string" ? Number(centsOrDollars) : centsOrDollars;
  const v = isCents ? n / 100 : n;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: v >= 1000 ? 0 : 2,
  }).format(v);
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

export function formatDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export const TIERS = [
  {
    id: "essential",
    name: "Essential",
    priceMonthly: 199,
    priceAnnual: 159,
    blurb: "For lean businesses with straightforward books.",
    features: [
      "Up to 100 transactions / month",
      "Monthly close by the 5th business day",
      "Real-time P&L dashboard",
      "One-click data export, any time",
      "Email support within 48 hours",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    priceMonthly: 349,
    priceAnnual: 279,
    blurb: "For businesses that are growing and need deeper books.",
    features: [
      "Up to 500 transactions / month",
      "Close by the 5th business day, 8:02am",
      "Catch-up cleanup included (up to 3 months)",
      "Quarterly 1:1 profit review",
      "Receipt capture & matching",
      "Priority support within 24 hours",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 499,
    priceAnnual: 399,
    blurb: "For teams that need the books to run themselves.",
    features: [
      "Unlimited transactions",
      "Close by the 3rd business day",
      "Read-only access for your bookkeeper or employee",
      "Weekly transaction reviews",
      "Tax-ready package every quarter",
      "Named senior reviewer",
    ],
  },
] as const;

export type PlanId = (typeof TIERS)[number]["id"];

export const THE_KEPT_PROMISE = [
  "A named, credentialed reviewer signs off every monthly close.",
  "Your books close on time, or you get an automatic credit.",
  "Your data is yours — export it any time, leave any time.",
  "No auto-renewal traps. No surprise charges. Ever.",
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  income: "Income",
  refunds: "Refunds",
  rent: "Rent",
  utilities: "Utilities",
  software: "Software",
  advertising: "Advertising",
  insurance: "Insurance",
  fuel: "Fuel",
  vehicle: "Vehicle",
  tools: "Tools & equipment",
  materials: "Materials",
  subcontractors: "Subcontractors",
  labor: "Labor",
  meals: "Meals",
  travel: "Travel",
  office: "Office",
  bank_fees: "Bank fees",
  taxes: "Taxes",
  misc: "Other",
  uncategorized: "To be classified",
};
