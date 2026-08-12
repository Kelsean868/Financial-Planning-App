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

  const continuationToAge = b.use("conventions.income_continuation_to_age") as number; // 21

  // Funeral: a DEFAULT. The client's own figure wins in either direction.
  const funeralDefault = b.use("conventions.funeral_cost_default") as number;
  const funeral = h.expectedFuneralCost ?? funeralDefault;
  if (h.expectedFuneralCost === undefined) {
    b.rule(`funeral cost defaulted to ${funeralDefault} — the client gave no figure`);
  }

  // Medical: a FLOOR. A lower client estimate does NOT win — understating final
  // illness costs is the direction that leaves the family short.
  const medicalMinimum = b.use("conventions.medical_cost_minimum") as number;
  const medicalStated = h.expectedMedicalCost ?? 0;
  const medical = Math.max(medicalStated, medicalMinimum);
  if (medical > medicalStated) {
    b.rule(
      `medical cost raised from ${medicalStated} to the ${medicalMinimum} minimum` +
      (h.expectedMedicalCost === undefined ? " — the client gave no figure" : " — the client's own estimate was below the floor")
    );
  }

  const outstandingLoans = nonMortgageDebtBalance(h);
  const mortgage = mortgageBalance(h);

  // Housing: the client states this. It is NOT inferred from the mortgage balance,
  // because "both" is a real case (mortgage on one property, rent on another) and no
  // rule over the balances can recover intent. Founder-confirmed 2026-07-17.
  const liquidates = h.housingStrategy === "liquidate-mortgage" || h.housingStrategy === "both";
  const replacesRent = h.housingStrategy === "replace-rent" || h.housingStrategy === "both";

  const mortgageLiquidation = liquidates ? mortgage : 0;
  let housingRentReplacement = 0;
  if (replacesRent) {
    const rentalMonths = b.use("conventions.rental_income_months") as number; // 120
    housingRentReplacement = (h.monthlyRent ?? 0) * rentalMonths;
    b.rule(`housing: ${rentalMonths} months rent replacement`);
    if (!h.monthlyRent) {
      b.caveat(
        "housing strategy asks for rent replacement, but no monthlyRent is recorded — " +
        "the rent component computed to zero. Capture the rent or correct the strategy."
      );
    }
  }
  if (liquidates) {
    b.rule("housing: mortgage liquidation");
    if (mortgage === 0) {
      b.caveat(
        "housing strategy asks to liquidate a mortgage, but no mortgage debt is recorded — " +
        "the liquidation component computed to zero. Capture the mortgage or correct the strategy."
      );
    }
  }
  if (h.housingStrategy === "none") b.rule("housing: no provision requested");
  if (h.housingStrategy === "both") {
    b.rule("housing: mortgage liquidation and rent replacement are ADDITIVE for this household");
  }

  const education = h.educationCost ?? 0;

  // Income continuation until the youngest child reaches 21, net of any NIS survivor benefit.
  const years = yearsUntilLastChildReaches(h, continuationToAge, on);
  const survivorMonthly = opts.nisSurvivorMonthly ?? 0;
  const netMonthlyNeed = Math.max(0, h.monthlyExpenses - survivorMonthly);
  const incomeContinuation = netMonthlyNeed * 12 * years;
  if (years > 0) b.rule(`income continuation for ${years.toFixed(2)} years to age ${continuationToAge}`);

  // The NIS survivors' benefit is a RESOURCE. Omitting it overstates the need — the
  // direction that sells more cover. That asymmetry is why silence is not acceptable
  // here: absent the figure, the engine says so rather than quietly assuming zero.
  if (opts.nisSurvivorMonthly === undefined) {
    b.caveat(
      "NIS survivors' benefit is NOT modelled — the NIBTT survivors' rate table has not been " +
      "extracted, so it is treated as zero. This OVERSTATES the income-continuation need for any " +
      "client with NIS contributions. Do not present this as the client's true need until the " +
      "table is sourced or the benefit is entered explicitly."
    );
  } else if (survivorMonthly > 0) {
    b.rule(`NIS survivors' benefit of ${survivorMonthly}/month nets off the income need`);
  } else {
    b.rule("NIS survivors' benefit confirmed as nil — no offset applied");
  }

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
