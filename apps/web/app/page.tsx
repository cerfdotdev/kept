import { LenisProvider } from "@/lib/lenis-provider";

// Nonce-based CSP requires dynamic rendering (Next 16 docs: content-security-policy).
export const dynamic = "force-dynamic";
import { Shell } from "@/components/landing/shell";
import { Grain } from "@/components/landing/grain";
import { Hero } from "@/components/landing/hero";
import { Marquee } from "@/components/landing/marquee";
import { Problem } from "@/components/landing/problem";
import { How } from "@/components/landing/how";
import { PromiseSection } from "@/components/landing/promise";
import { Pricing } from "@/components/landing/pricing";
import { Cta } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";
import { CustomCursor } from "@/components/landing/custom-cursor";

export default function Home() {
  return (
    <LenisProvider>
      <Shell>
        <Grain />
        <Hero />
        <Marquee />
        <Problem />
        <How />
        <PromiseSection />
        <Pricing />
        <Cta />
        <Footer />
        <CustomCursor />
      </Shell>
    </LenisProvider>
  );
}
