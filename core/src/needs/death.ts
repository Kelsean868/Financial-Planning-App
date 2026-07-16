import type { DeathNeedsProfile, Household, ISODate, TTD } from "../types.ts";
import { ProvenanceBuilder } from "../provenance.ts";
import { mortgageBalance, nonMortgageDebtBalance, yearsUntilLastChildReaches } from "../household.ts";

/**
 * Tatil Life's standardised T&T death-needs formula.
 * Not invented here — see research/factfinder-analysis.md.
 *
 * Deliberately OMITS the US/AU estate-tax liquidity driver: T&T has no estate,
 * inheritance or gift tax. The T&T estate concern is probate bypass and titling.
 */
export function computeDeathNeeds(
  h: Household,
  on: ISODate,
  opts: { nisSurvivorMonthly?: TTD } = {}
): DeathNeedsProfile {
  const b = new ProvenanceBuilder();

  const rentalMonths = b.use("conventions.rental_income_months") as number; // 120
  const continuationToAge = b.use("conventions.income_continuation_to_age") as number; // 21

  const funeral = h.expectedFuneralCost ?? 0;
  const medical = h.expectedMedicalCost ?? 0;
  const outstandingLoans = nonMortgageDebtBalance(h);
  const mortgage = mortgageBalance(h);

  // Housing: liquidate the mortgage if they own, else fund `rentalMonths` of rent.
  // INFERENCE — the Tatil form lists these as separate lines and does not state
  // they are alternatives. This is the only reading that avoids double-counting.
  const owns = mortgage > 0;
  const mortgageLiquidation = owns ? mortgage : 0;
  const housingRentReplacement = owns ? 0 : (h.monthlyRent ?? 0) * rentalMonths;
  b.caveat(
    "housing need treats mortgage liquidation and rent replacement as ALTERNATIVES " +
    "(own => liquidate; rent => fund 120 months). The Tatil form lists them separately " +
    "without stating they are exclusive. Confirm with the founder before relying on this."
  );
  b.rule(owns ? "housing: mortgage liquidation" : "housing: 120 months rent replacement");

  const education = h.educationCost ?? 0;

  // Income continuation until the youngest child reaches 21, net of any NIS survivor benefit.
  const years = yearsUntilLastChildReaches(h, continuationToAge, on);
  const survivorMonthly = opts.nisSurvivorMonthly ?? 0;
  const netMonthlyNeed = Math.max(0, h.monthlyExpenses - survivorMonthly);
  const incomeContinuation = netMonthlyNeed * 12 * years;
  if (years > 0) b.rule(`income continuation for ${years.toFixed(2)} years to age ${continuationToAge}`);
  if (survivorMonthly > 0) b.rule(`NIS survivor benefit of ${survivorMonthly}/month nets off the income need`);

  const totalNeeds =
    funeral + medical + outstandingLoans + mortgageLiquidation +
    housingRentReplacement + education + incomeContinuation;

  const lifeInsurance = 0; // in-force cover is applied by the GapCalculator, not here
  const assets = {
    savings: h.savings,
    lifeInsurance,
    otherInvestments: h.otherInvestments,
    total: h.savings + lifeInsurance + h.otherInvestments,
  };

  const insuranceNeed = Math.max(0, totalNeeds - assets.total);
  if (totalNeeds - assets.total < 0) b.rule("assets exceed needs — insurance need floored at zero");

  return {
    funeral, medical, outstandingLoans, mortgageLiquidation, housingRentReplacement,
    education, incomeContinuation, totalNeeds, assets, insuranceNeed,
    provenance: b.build(),
  };
}
