import { z } from "zod";
import { runRules, normalizeText, FALLBACK_CATEGORY, type Category, CATEGORIES } from "./rules.js";

export interface LlmAdapter {
  classify(description: string): Promise<{ category: Category; confidence: number } | null>;
}

const LLM_OUTPUT = z.object({
  category: z.enum(CATEGORIES),
  confidence: z.number().min(0).max(1),
  merchant: z.string().optional(),
});

export class OpenAiCompatibleAdapter implements LlmAdapter {
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor() {
    this.baseUrl = process.env.LLM_BASE_URL ?? "https://api.openai.com/v1";
    this.apiKey = process.env.LLM_API_KEY ?? "";
    this.model = process.env.LLM_MODEL ?? "gpt-4o-mini";
  }

  enabled(): boolean {
    return Boolean(this.apiKey);
  }

  async classify(description: string): Promise<{ category: Category; confidence: number } | null> {
    if (!this.enabled()) return null;
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `You classify small-business bank transactions into exactly one category: ${CATEGORIES.join(", ")}.
"income" is money received from customers. Everything else is an expense category.
Return strict JSON: {"category":"<category>","confidence":<0.0-1.0>}. Never include anything else.`,
            },
            { role: "user", content: `Transaction: "${description}"` },
          ],
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;
      const parsed = LLM_OUTPUT.safeParse(JSON.parse(content));
      if (!parsed.success) return null;
      return {
        category: parsed.data.category,
        confidence: Math.min(0.95, Math.max(0.4, parsed.data.confidence)),
      };
    } catch {
      return null;
    }
  }
}

export interface MerchantMatch {
  merchantId: number;
  displayName: string;
  category: Category;
  similarity: number;
}

/**
 * Ensemble classifier: rules -> pg_trgm merchant match -> optional LLM.
 * Returns a final verdict with confidence and risk tier.
 */
export async function classifyTransaction(
  description: string,
  amountCents: number,
  merchantMatch: MerchantMatch | null,
  llm: LlmAdapter | null,
): Promise<{
  category: Category;
  confidence: number;
  tier: "t1" | "t2" | "t3" | "t4";
  autoApprove: boolean;
  source: "rule" | "merchant" | "llm" | "fallback";
  ruleRef?: string;
  matchedMerchantId?: number;
}> {
  const ruleHit = runRules(description);
  const simScore = merchantMatch?.similarity ?? 0;
  const absAmount = Math.abs(amountCents);

  // Risk tiers by amount (business rules)
  let tier: "t1" | "t2" | "t3" | "t4" = "t1";
  if (absAmount >= 500_000) tier = "t4";
  else if (absAmount >= 100_000) tier = "t3";
  else if (absAmount >= 25_000) tier = "t2";

  // 1) Strong rule hit: high confidence, no LLM needed
  if (ruleHit && ruleHit.confidence >= 0.85 && tier !== "t4") {
    return {
      category: ruleHit.category,
      confidence: ruleHit.confidence,
      tier,
      autoApprove: true,
      source: "rule",
      ruleRef: ruleHit.rule,
    };
  }

  // 2) Merchant catalog match (learned feedback loop)
  if (merchantMatch && simScore >= 0.55) {
    const conf = Math.min(0.95, 0.55 + simScore * 0.35);
    if (conf >= 0.85 && tier !== "t4") {
      return {
        category: merchantMatch.category,
        confidence: conf,
        tier,
        autoApprove: true,
        source: "merchant",
        matchedMerchantId: merchantMatch.merchantId,
      };
    }
    return {
      category: merchantMatch.category,
      confidence: conf,
      tier: tier === "t1" ? "t2" : tier,
      autoApprove: false,
      source: "merchant",
      matchedMerchantId: merchantMatch.merchantId,
    };
  }

  // 3) LLM
  if (llm) {
    const llmHit = await llm.classify(description);
    if (llmHit) {
      if (llmHit.confidence >= 0.85 && tier !== "t4") {
        return { ...llmHit, tier, autoApprove: true, source: "llm" };
      }
      return { ...llmHit, tier: tier === "t1" ? "t2" : tier, autoApprove: false, source: "llm" };
    }
  }

  // 4) Weak rule or fallback: always to human
  if (ruleHit) {
    return {
      category: ruleHit.category,
      confidence: ruleHit.confidence,
      tier: "t3",
      autoApprove: false,
      source: "rule",
      ruleRef: ruleHit.rule,
    };
  }

  return {
    category: FALLBACK_CATEGORY,
    confidence: 0.4,
    tier: "t3",
    autoApprove: false,
    source: "fallback",
  };
}

export { normalizeText };
