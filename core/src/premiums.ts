/**
 * Rough premium figures (Section 2 §2.5). Every figure here comes from rate rows marked
 * `estimate`. The engine returns a band labelled "rough", never a quote; when the band's top is
 * under the plan's minimum, it returns the minimum labelled "the minimum premium".
 */
import { ProvenanceBuilder } from "./provenance.ts";
import type { ProductId, ProductSpec } from "./parameters/tatil-products-2026-10.ts";

export type RateKind = "term" | "whole-life" | "ci" | "rest-assured";

export interface PremiumBand {
  readonly low: number;
  readonly high: number;
  /** "rough" for an estimate band; "the minimum premium" when the minimum binds. Never a price. */
  readonly label: "rough" | "the minimum premium";
}

const RATE_PATHS: Record<RateKind, [string, string]> = {
  term: ["core:ff.premiumRates.termPer1000", "core:ff.premiumRates.termAgeGrowth"],
  "whole-life": ["core:ff.premiumRates.wholeLifePer1000", "core:ff.premiumRates.wholeLifeAgeGrowth"],
  ci: ["core:ff.premiumRates.ciPer1000", "core:ff.premiumRates.ciAgeGrowth"],
  "rest-assured": ["core:ff.premiumRates.restAssuredPer1000", "core:ff.premiumRates.restAssuredAgeGrowth"],
};

/** Estimated monthly premium per $1,000 of cover at an age (sample rates, anchored at the base age). */
export function ratePer1000(b: ProvenanceBuilder, kind: RateKind, age: number): number {
  const [base, growth] = RATE_PATHS[kind];
  return b.num(base) * Math.pow(b.num(growth), age - b.num("core:ff.premiumRates.baseAge"));
}

export function product(b: ProvenanceBuilder, id: ProductId): ProductSpec {
  return b.get<ProductSpec>(`core:products.${id}`);
}

/** A rough band around an estimate, with the plan minimum applied (§2.5.2). */
export function roughBand(b: ProvenanceBuilder, estimate: number, minimumMonthly: number | null): PremiumBand {
  const spread = b.num("core:ff.premiumRates.bandSpread");
  const low = estimate * (1 - spread);
  const high = estimate * (1 + spread);
  if (minimumMonthly !== null && high < minimumMonthly) {
    return Object.freeze({ low: minimumMonthly, high: minimumMonthly, label: "the minimum premium" as const });
  }
  return Object.freeze({
    low: minimumMonthly !== null ? Math.max(minimumMonthly, low) : low,
    high,
    label: "rough" as const,
  });
}

/** Monthly premium estimate for an amount of cover. */
export function premiumFor(b: ProvenanceBuilder, kind: RateKind, cover: number, age: number): number {
  return cover * ratePer1000(b, kind, age) / 1000;
}

/** Cover an amount of premium buys, at the estimate rate. */
export function coverForPremium(b: ProvenanceBuilder, kind: RateKind, monthly: number, age: number): number {
  const r = ratePer1000(b, kind, age);
  return r > 0 ? monthly / r * 1000 : 0;
}

/* --------------------------------------------------------------- fitting to minimums */

export interface FitRow<K> {
  readonly key: K;
  /** Minimum premium a month; 0 when the plan has none. */
  readonly min: number;
  /** Share of the remainder after minimums. */
  readonly weight: number;
}

export interface FitResult<K> {
  readonly funded: readonly { readonly key: K; readonly monthly: number; readonly min: number }[];
  /** Plans the budget cannot carry at their minimum, with the minimum they need. */
  readonly notYet: readonly { readonly key: K; readonly needs: number }[];
}

/**
 * Fit plans to a monthly total so that **no funded plan is below its minimum** (guard 16).
 *
 * Rows are in priority order. While the minimums exceed the total, the lowest-priority plan
 * that has a minimum moves to "not yet"; then each "not yet" plan that now fits comes back.
 * Every funded plan gets its minimum, and the remainder is shared by weight.
 *
 * The prototype funded a lone plan below its minimum when nothing else was left (run record R3);
 * here that plan goes to "not yet" instead.
 */
export function fitToMinimums<K>(rows: readonly FitRow<K>[], total: number): FitResult<K> {
  if (total <= 0) {
    return { funded: [], notYet: rows.filter((r) => r.min > 0).map((r) => ({ key: r.key, needs: r.min })) };
  }
  const fund = [...rows];
  const later: FitRow<K>[] = [];
  const sumMin = (xs: readonly FitRow<K>[]): number => xs.reduce((a, x) => a + x.min, 0);
  while (sumMin(fund) > total) {
    let k = fund.length - 1;
    while (k >= 0 && fund[k]!.min <= 0) k--;
    if (k < 0) break;
    later.unshift(fund.splice(k, 1)[0]!);
  }
  for (let k = 0; k < later.length; k++) {
    if (sumMin(fund) + later[k]!.min <= total) {
      fund.push(later[k]!);
      later.splice(k, 1);
      k--;
    }
  }
  fund.sort((a, b) => rows.indexOf(a) - rows.indexOf(b));
  const rem = total - sumMin(fund);
  const shares = fund.reduce((a, x) => a + x.weight, 0) || 1;
  return {
    funded: fund.map((x) => ({ key: x.key, monthly: x.min + rem * x.weight / shares, min: x.min })),
    notYet: later.map((x) => ({ key: x.key, needs: x.min })),
  };
}
