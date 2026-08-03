export const CATEGORIES = [
  "income",
  "refunds",
  "rent",
  "utilities",
  "software",
  "advertising",
  "insurance",
  "fuel",
  "vehicle",
  "tools",
  "materials",
  "subcontractors",
  "labor",
  "meals",
  "travel",
  "office",
  "bank_fees",
  "taxes",
  "misc",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const RULES: Array<{ pattern: RegExp; category: Category; confidence: number }> = [
  { pattern: /^(stripe|square|paypal|shopify payments|clover|adyen).*(payment|payout|transfer|chargeback)/i, category: "income", confidence: 0.95 },
  { pattern: /^(deposit|wire|zelle|venmo|direct deposit)/i, category: "income", confidence: 0.9 },
  { pattern: /refund/i, category: "refunds", confidence: 0.92 },
  { pattern: /home depot|lowes|ace hardware|true value|grainger|mcmaster/i, category: "materials", confidence: 0.93 },
  { pattern: /(shell|chevron|exxon|bp|circle k|7-eleven|gas|fuel|marathon|speedway|citgo|sunoco)/i, category: "fuel", confidence: 0.9 },
  { pattern: /uber|lyft|taxi|parking|hotel|airbnb|amtrak|delta|united|american airlines|southwest/i, category: "travel", confidence: 0.92 },
  { pattern: /doordash|ubereats|grubhub|postmates|chipotle|mcdonald|starbucks|subway/i, category: "meals", confidence: 0.92 },
  { pattern: /adobe|hubspot|salesforce|slack|zoom|notion|figma|atlassian|jira|github|google workspace|microsoft 365|quickbooks|gusto|canva|mailchimp|shopify|wix|squarespace|wordpress|aws|vercel|digitalocean|dropbox|docusign|calendly|stripe fee/i, category: "software", confidence: 0.94 },
  { pattern: /google ads|facebook ads|meta ads|tiktok ads|amazon ads|adwords|bing ads|linkedin ads|instagram ads/i, category: "advertising", confidence: 0.96 },
  { pattern: /geico|progressive|state farm|allstate|liberty mutual|farmers|nationwide|hiscox|next insurance|hiscox|insurance/i, category: "insurance", confidence: 0.94 },
  { pattern: /walmart|costco|sams club|target|office depot|staples|best buy|amazon.com/i, category: "office", confidence: 0.8 },
  { pattern: /(fedex|ups|usps|dhl|postal|shipping|freight)/i, category: "misc", confidence: 0.75 },
  { pattern: /irs|franchise tax|sales tax|dps|treasury|tax payment/i, category: "taxes", confidence: 0.9 },
  { pattern: /overdraft|monthly maintenance|service fee|bank fee|atm fee/i, category: "bank_fees", confidence: 0.95 },
  { pattern: /landlord|property management|rental payment|realty/i, category: "rent", confidence: 0.9 },
  { pattern: /(pg&e|pge|socal edison|sce|con ed|dominion|duke energy|comcast|xfinity|at&t|verizon|t-mobile|water|sewer|waste management|republic services)/i, category: "utilities", confidence: 0.92 },
  { pattern: /subcontractor|subcontract|1099/i, category: "subcontractors", confidence: 0.85 },
  { pattern: /payroll|wages|paycheck|salary/i, category: "labor", confidence: 0.9 },
  { pattern: /(auto|truck|lease|repair shop|muffler|tire|autozone|oreilly|napa|advance auto|car wash)/i, category: "vehicle", confidence: 0.88 },
  { pattern: /(milwaukee|dewalt|makita|harbor freight|fastenal|industrial|plumbing supply|electrical supply|roofing supply)/i, category: "tools", confidence: 0.85 },
  { pattern: /lumber|wood|drywall|paint|concrete|cement|gravel|rebar/i, category: "materials", confidence: 0.87 },
];

export const FALLBACK_CATEGORY: Category = "misc";

export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function runRules(description: string): { category: Category; confidence: number; rule: string } | null {
  const norm = normalizeText(description);
  for (const rule of RULES) {
    if (rule.pattern.test(norm)) {
      return { category: rule.category, confidence: rule.confidence, rule: rule.pattern.source };
    }
  }
  return null;
}
