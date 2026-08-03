import { describe, expect, it } from "vitest";
import { runRules, normalizeText } from "./rules.js";

describe("rules classifier", () => {
  it("normalizes text", () => {
    expect(normalizeText("  HOME DEPOT #2043  ")).toBe("home depot 2043");
  });
  it("matches fuel", () => {
    expect(runRules("Shell station 123")?.category).toBe("fuel");
  });
  it("matches software", () => {
    expect(runRules("QuickBooks subscription")?.category).toBe("software");
  });
  it("matches income", () => {
    expect(runRules("Stripe payout 54321")?.category).toBe("income");
  });
  it("returns null for unknown", () => {
    expect(runRules("zzz random merchant 42")).toBeNull();
  });
});
