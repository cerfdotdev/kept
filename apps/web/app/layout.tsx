import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Source_Sans_3 } from "next/font/google";
import "./globals.css";

// Nonce-based CSP requires dynamic rendering on every page (Next 16 docs:
// content-security-policy). Static prerender cannot receive per-request nonces.
export const dynamic = "force-dynamic";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Kept by Ledgerfolk — Your books, kept.",
    template: "%s · Kept by Ledgerfolk",
  },
  description:
    "Done-for-you bookkeeping for small businesses. A named reviewer closes your books on time, every month. Your data is yours. No lock-in, no auto-renewal traps.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "Kept by Ledgerfolk — Your books, kept.",
    description:
      "Done-for-you bookkeeping. A named reviewer closes your books on time, every month. Your data is yours.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#F7F3EA",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${sourceSans.variable} ${plexMono.variable}`}>
      <body className="font-body">{children}</body>
    </html>
  );
}
