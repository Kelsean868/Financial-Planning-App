/**
 * Premium figures for the engine (Section 2 §2.5, real-life-rates spec 2026-10-29).
 *
 * Every rate now comes from Tatil's harvested rate book, through `life-rates.ts`, which owns the
 * arithmetic: bands, the $360 fee, the modal factor, interpolation between harvested ages, the SAMPLE
 * fallback and Tatil's minimum premiums. This module holds what sits around it — the rough band, product
 * eligibility by rated age, the Rest Assured II wrappers, and fitting plans to their minimums.
 *
 * The engine still returns a band labelled "rough", never a quote; when the band's top is under the
 * plan's minimum, it returns the minimum labelled "the minimum premium".
 */
import { ProvenanceBuilder } from "./provenance.ts";
import {
  premiumQuote, coverForPremium as coverFromRates, ratePer1000, cents, restAssuredAnchorPer1000,
  type RateKind, type Rating, type SampleKind, type PremiumQuote,
} from "./life-rates.ts";
import type { ProductId, ProductSpec } from "./parameters/tatil-products-2026-10.ts";
import type { Sex } from "./life-case-facts.ts";

export { premiumQuote, ratePer1000, cents };
export type { RateKind, Rating, SampleKind, PremiumQuote };

export interface PremiumBand {
  readonly low: number;
  readonly high: number;
  /** "rough" for an estimate band; "the minimum premium" when the minimum binds. Never a price. */
  readonly label: "rough" | "the minimum premium";
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

/**
 * Monthly premium for an amount of cover, at an age next birthday. Null past the product's maximum issue
 * age ("Not available at this age"); callers build a plan item only after `canIssue`, so in practice the
 * null is the backstop rather than a case they handle.
 */
export function premiumFor(
  b: ProvenanceBuilder, kind: RateKind, cover: number, anb: number, rating: Rating,
): number | null {
  return premiumQuote(b, kind, cover, anb, rating).monthly;
}

/** Cover a monthly premium buys, worked out per band (spec §5.6). */
export function coverForPremium(
  b: ProvenanceBuilder, kind: RateKind, monthly: number, anb: number, rating: Rating,
): number {
  return coverFromRates(b, kind, monthly, anb, rating);
}

/** The rating for the client themself. The nicotine answer is absent until they answer it. */
export function clientRating(client: { readonly sex: Sex; readonly smoker?: boolean }): Rating {
  return { sex: client.sex, smoker: client.smoker ?? null, who: "You" };
}

/* --------------------------------------------------------------- Rest Assured II */

/** The person a Rest Assured II plan insures. */
export interface RestAssuredInsured {
  /** Whole years, as the engine holds it (`parentAge`, the client's age, a loved one's age). */
  readonly age: number;
  /** Null when it cannot be told: priced on the male rate (the higher one), with a caveat. */
  readonly sex: Sex | null;
  /** Who, for the caveat. */
  readonly who: string;
}

/** Every plan is rated, and issued, on age next birthday (fix run 3, Change 5). */
export function ratedAge(age: number): number {
  return age + 1;
}

/** A product can be issued when the insured's rated age is within its issue ages. */
export function canIssue(b: ProvenanceBuilder, id: ProductId, age: number): boolean {
  const { min, max } = b.get<ProductSpec>(`core:products.${id}`).issueAge;
  const rated = ratedAge(age);
  return (min === null || rated >= min) && (max === null || rated <= max);
}

/** Rest Assured II is rated on age next birthday. */
export function restAssuredRatedAge(age: number): number {
  return ratedAge(age);
}

/** Issue only when the rated age is within the product's issue ages. */
export function restAssuredEligible(b: ProvenanceBuilder, age: number): boolean {
  return canIssue(b, "rest-assured-ii", age);
}

/** The rating a Rest Assured II insured is priced on. Nicotine is never asked of a parent or an elder. */
export function restAssuredRating(insured: RestAssuredInsured): Rating {
  return { sex: insured.sex, smoker: null, who: insured.who };
}

/**
 * Monthly premium per $1,000 of cover from the two quoted ApplyOn rates, moved by the age factor away from
 * the quoted age. **Fallback only now:** the harvested grid (ANB 20 to 70) prices everything inside it, and
 * this covers ANB 71 to 80, which nobody has harvested (spec R3, fence F5).
 */
export function restAssuredPer1000(b: ProvenanceBuilder, insured: RestAssuredInsured): number {
  if (insured.sex === null) {
    b.caveat(`${insured.who}: sex not known, so Rest Assured II is priced on the male rate (the higher one).`);
  }
  return restAssuredAnchorPer1000(b, restAssuredRatedAge(insured.age), insured.sex);
}

/** Monthly Rest Assured II premium for an amount of cover, from the rate book. */
export function restAssuredPremium(b: ProvenanceBuilder, insured: RestAssuredInsured, cover: number): number {
  return premiumFor(b, "rest-assured", cover, restAssuredRatedAge(insured.age), restAssuredRating(insured)) ?? 0;
}

/** Rest Assured II cover a monthly premium buys. */
export function restAssuredCoverFor(b: ProvenanceBuilder, insured: RestAssuredInsured, monthly: number): number {
  return coverForPremium(b, "rest-assured", monthly, restAssuredRatedAge(insured.age), restAssuredRating(insured));
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
