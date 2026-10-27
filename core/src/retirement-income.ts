/**
 * The fact-finder retirement gap: the "you live long" scenario's input (closing brief §9.7) and the
 * ladder's retirement item. NIS minimum pension when the client pays NIS, the SCP to the NIS + SCP cap,
 * a pension from work; the gap to the income wanted, the Destiny saving that closes it at the planning
 * rate, the floor stress, registered eligibility and the tax relief.
 *
 * The fact-finder does not capture NIS contributions or lifetime earnings, so this does not call
 * `needs/retirement.ts` (run record R11).
 */
import { ProvenanceBuilder } from "./provenance.ts";
import type { Provenance } from "./types.ts";
import type { LifeCaseFacts } from "./life-case-facts.ts";
import type { NetPay } from "./household-budget.ts";
import { workPension, type WorkPension } from "./needs/work-pension.ts";
import { routeAnnuity, monthlyToReach, stressAgainstFloor, type AnnuityRouting, type FloorStress } from "./annuity-routing.ts";

export interface RetirementIncome {
  readonly retireAge: number;
  readonly wantedMonthly: number;
  readonly nisMonthly: number;
  readonly scpMonthly: number;
  readonly workPension: WorkPension;
  /** Income the client can count on at retirement. */
  readonly floorMonthly: number;
  readonly gapMonthly: number;
  readonly yearsToRetirement: number;
  readonly capitalNeededToday: number;
  readonly capitalNeededAtRetirement: number;
  /** Destiny saving a month that closes the gap, sized at the advisor-set planning rate. */
  readonly saveMonthly: number;
  /** At least the Destiny minimum when a gap exists. */
  readonly destinyMonthly: number;
  readonly routing: AnnuityRouting;
  /** Tax back a year on the registered route. */
  readonly reliefAnnual: number;
  readonly stress: readonly FloorStress[];
  /** Plan to this age, not the average (85 men, 90 women, +5 for a long-lived family). */
  readonly planToAge: number;
  readonly provenance: Provenance;
}

export function computeRetirementIncome(facts: LifeCaseFacts, netPay: NetPay): RetirementIncome {
  const b = new ProvenanceBuilder();
  const w = facts.wishes;
  const wp = workPension(b, facts.workPension, w.retireAge);
  const nis = facts.client.nisPaying ? b.num("nis.minimum_pension") : 0;
  if (facts.client.nisPaying) b.caveat(`NIS is taken at the $${nis.toLocaleString("en-US")} minimum pension; the fact-finder does not capture contributions or earnings history.`);
  const scpMax = b.num("core:ff.offsets.scpMonthly");
  const cap = b.num("core:ff.offsets.nisPlusScpCap");
  const scpAge = (b.useNode("scp.eligibility").node as { age: number }).age;
  const scpAt65 = Math.max(0, Math.min(scpMax, cap - nis - wp.monthly));
  const floor = nis + wp.monthly + (w.retireAge >= scpAge ? scpAt65 : 0);
  const gap = Math.max(0, w.retireIncomeMonthly - floor);
  const yrs = Math.max(1, w.retireAge - facts.client.age);
  const capToday = gap * 12 / b.num("core:ff.closing.retirementCapitalRate");
  const capThen = capToday * Math.pow(1 + b.num("core:ff.rates.inflation"), yrs);
  const plan = b.num("core:ff.rates.planningReturn");
  const save = monthlyToReach(plan, capThen, yrs);
  const destinyMin = b.get<{ minPremiumMonthly: number }>("core:products.destiny").minPremiumMonthly;
  const routing = routeAnnuity(b, { ageAtGoal: w.retireAge }, {
    paysTax: netPay.paysTax, grossAnnual: facts.client.grossMonthly * 12, capHeadroomAnnual: netPay.deductionHeadroomAnnual,
  });
  const relief = routing.mode === "registered" ? Math.min(save * 12, netPay.deductionHeadroomAnnual) * b.num("core:ff.closing.reliefRate") : 0;
  const destinyMonthly = gap > 0 ? Math.max(destinyMin, save) : 0;
  const stress = gap > 0
    ? (["destiny-settler", "destiny-explorer", "destiny-adventurer"] as const).map((v) => stressAgainstFloor(b, v, save, capThen, yrs))
    : [];
  const pt = b.get<{ male: number; female: number; longLivedExtra: number }>("core:ff.closing.planToAge");
  const planTo = (facts.client.sex === "female" ? pt.female : pt.male) + (facts.client.longLived ? pt.longLivedExtra : 0);
  b.rule("retirement saving is sized on the advisor-set planning rate and stressed against each Destiny floor");
  return {
    retireAge: w.retireAge, wantedMonthly: w.retireIncomeMonthly, nisMonthly: nis,
    scpMonthly: w.retireAge >= scpAge ? scpAt65 : 0, workPension: wp, floorMonthly: floor, gapMonthly: gap,
    yearsToRetirement: yrs, capitalNeededToday: capToday, capitalNeededAtRetirement: capThen,
    saveMonthly: save, destinyMonthly, routing, reliefAnnual: relief, stress, planToAge: planTo, provenance: b.build(),
  };
}
