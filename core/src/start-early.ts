/**
 * Module 6 — start early (Section 2 §2.3): compound growth, the cost of waiting, and the value at any
 * earlier retirement age. All figures in today's money, after the assumption set's inflation.
 * The returns are illustrations of a kind of account, never a product figure (addendum §13).
 */
import { ProvenanceBuilder } from "./provenance.ts";
import type { Provenance } from "./types.ts";

export type IllustrativeReturn = "bank" | "balanced" | "growth";

export interface StartEarlyInput {
  readonly age: number;
  readonly monthly: number;
  readonly returnKind: IllustrativeReturn;
  readonly delayYears: number;
  readonly paysTax: boolean;
}

export interface StartEarlyResult {
  readonly toAge: number;
  readonly years: number;
  readonly realReturn: number;
  readonly returnLabel: string;
  readonly returnPct: number;
  readonly valueStartNow: number;
  readonly valueStartLater: number;
  readonly costOfWaiting: number;
  readonly paidIn: number;
  readonly growth: number;
  /** Rough income for life a month from the target age, if started now. */
  readonly incomeForLifeMonthly: number;
  /** True when the return is below inflation: the money buys less every year. */
  readonly losesToInflation: boolean;
  /** Below the Destiny minimum: a Destiny plan starts at its minimum; a unit trust can start smaller. */
  readonly belowDestinyMinimum: boolean;
  /** Value by age, start now against start later; any age before the target is an early retirement point. */
  readonly byAge: readonly { readonly age: number; readonly startNow: number; readonly startLater: number }[];
  readonly provenance: Provenance;
}

/** Value of `amt` a month after `years` at an annual real return, monthly compounding. */
export function futureValueMonthly(amt: number, years: number, real: number): number {
  const m = Math.pow(1 + real, 1 / 12) - 1;
  const n = Math.max(0, years) * 12;
  return n <= 0 ? 0 : Math.abs(m) < 1e-9 ? amt * n : amt * (Math.pow(1 + m, n) - 1) / m;
}

export function computeStartEarly(input: StartEarlyInput): StartEarlyResult {
  const b = new ProvenanceBuilder();
  const infl = b.num("core:ff.rates.inflation");
  const rets = b.get<Record<IllustrativeReturn, { label: string; pct: number }>>("core:ff.startEarly.illustrativeReturns");
  const ret = rets[input.returnKind];
  const real = (1 + ret.pct / 100) / (1 + infl) - 1;
  const to = b.num("core:ff.startEarly.targetAge");
  const yrs = Math.max(0, to - input.age);
  const lateYrs = Math.max(0, yrs - input.delayYears);
  const now = futureValueMonthly(input.monthly, yrs, real);
  const late = futureValueMonthly(input.monthly, lateYrs, real);
  const paid = input.monthly * 12 * yrs;
  const step = Math.max(1, Math.ceil(yrs / 18));
  const ages: number[] = [];
  for (let a = input.age; a <= to; a += step) ages.push(a);
  if (ages[ages.length - 1] !== to && yrs > 0) ages.push(to);
  const destinyMin = b.get<{ minPremiumMonthly: number }>("core:products.destiny").minPremiumMonthly;
  b.rule("illustration only: the return is a kind of account, not a product figure");
  return {
    toAge: to, years: yrs, realReturn: real, returnLabel: ret.label, returnPct: ret.pct,
    valueStartNow: now, valueStartLater: late, costOfWaiting: now - late, paidIn: paid, growth: Math.max(0, now - paid),
    incomeForLifeMonthly: now * b.num("core:ff.startEarly.drawdownRate") / 12,
    losesToInflation: real <= 0,
    belowDestinyMinimum: input.monthly < destinyMin,
    byAge: ages.map((a) => ({
      age: a,
      startNow: futureValueMonthly(input.monthly, a - input.age, real),
      startLater: futureValueMonthly(input.monthly, a - input.age - input.delayYears, real),
    })),
    provenance: b.build(),
  };
}
