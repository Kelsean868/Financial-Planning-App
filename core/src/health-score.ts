/**
 * Module 5 — the money health score (Section 2 §2.3): 0–100 from five parts of 20 each.
 * (Financial health: nothing here is a health answer.)
 */
import { ProvenanceBuilder } from "./provenance.ts";
import type { Provenance } from "./types.ts";
import type { HouseholdBudget } from "./household-budget.ts";
import type { DeathNeedResult } from "./death-need.ts";
import type { RetirementIncome } from "./retirement-income.ts";

export interface ScorePart {
  readonly key: "spending" | "cushion" | "debt" | "retirement" | "protection";
  readonly label: string;
  readonly points: number;
  readonly explains: string;
}

export interface HealthScore {
  readonly score: number;
  readonly label: string;
  readonly parts: readonly ScorePart[];
  readonly provenance: Provenance;
}

export function computeHealthScore(input: {
  budget: HouseholdBudget; deathNeed: DeathNeedResult; retirement: RetirementIncome; savings: number;
}): HealthScore {
  const b = new ProvenanceBuilder();
  const max = b.num("core:ff.healthScore.partMax");
  const span = b.num("core:ff.healthScore.needsRatioSpan");
  const full = b.num("core:ff.healthScore.bufferFullMonths");
  const factor = b.num("core:ff.healthScore.badDebtFactor");
  const { budget, deathNeed, retirement } = input;
  const clamp = (x: number): number => Math.max(0, Math.min(max, x));
  const sc1 = clamp(max * (1 - budget.needsRatio) / span);
  const sc2 = clamp(budget.bufferMonths / full * max);
  const sc3 = budget.expensiveDebt <= 0 ? max : Math.max(0, max - budget.expensiveDebt / Math.max(1, budget.netPay.householdNetMonthly * 12) * factor);
  const sc4 = retirement.wantedMonthly > 0 ? Math.min(max, max * retirement.floorMonthly / retirement.wantedMonthly) : max;
  const held = deathNeed.cover.knownLife + input.savings;
  const sc5 = max * held / Math.max(1, held + deathNeed.tiers.essential);
  const score = Math.round(sc1 + sc2 + sc3 + sc4 + sc5);
  const labels = b.get<readonly { from: number; label: string }[]>("core:ff.healthScore.labels");
  return {
    score,
    label: labels.find((l) => score >= l.from)!.label,
    parts: [
      { key: "spending", label: "Spending", points: sc1, explains: "Needs as a share of take-home" },
      { key: "cushion", label: "Savings cushion", points: sc2, explains: "Months of costs saved, out of 6" },
      { key: "debt", label: "Debt", points: sc3, explains: "Expensive debt against a year's pay" },
      { key: "retirement", label: "Retirement", points: sc4, explains: "Income you can count on, against what you want" },
      { key: "protection", label: "Protection", points: sc5, explains: "What your family would get, against what they would need" },
    ],
    provenance: b.build(),
  };
}
