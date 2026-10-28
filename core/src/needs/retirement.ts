import { retirementFloor } from "../../../parameters/tt-parameters.js";
import type { RetirementNeedsProfile, TTD } from "../types.ts";
import { ProvenanceBuilder } from "../provenance.ts";

/**
 * The contribution table `nisPension` resolves an earnings class against. It defaults
 * this date internally; naming it here is what lets the declared parameter list point at
 * the exact table that was read, rather than at the family of tables.
 */
const NIS_CONTRIBUTION_TABLE = "2016-09-05";

/**
 * Retirement shortfall against the NIS + SCP guaranteed floor.
 *
 * NIS and SCP MUST be modelled together: NIS retirement pension counts as SCP
 * assessed income (SCP form items 6 & 31), so it claws back a band of SCP.
 * `lifetimeAvgMonthlyEarnings` is the WHOLE-WORKING-LIFE average, not final salary
 * and not the last 7 years — confirmed verbatim from NIBTT training material.
 *
 * TODO(provenance): `retirementFloor` reads `P` directly, so this function must
 * mirror its parameter reads by hand — a declared list that can drift from the reads
 * that actually produced the number (and it had: it declared two parameters that are
 * never read and omitted the NIBTT rate table the figure comes from). The structural
 * fix is to thread a `ProvenanceBuilder` through `retirementFloor`/`nisPension`/
 * `scpBenefit` so provenance is recorded by construction rather than by discipline.
 * That change touches `parameters/tt-parameters.js`, which is shared with the browser
 * calculators, so it belongs in its own change — before the recommendation engine
 * lands on top of these numbers.
 */
export function computeRetirementNeeds(input: {
  lifetimeAvgMonthlyEarnings: TTD;
  totalContributions: number;
  retirementAge: number;
  targetMonthlyIncome: TTD;
  otherMonthlyIncome?: TTD;
}): RetirementNeedsProfile {
  const b = new ProvenanceBuilder();
  const other = input.otherMonthlyIncome ?? 0;
  const floor = retirementFloor(
    input.lifetimeAvgMonthlyEarnings,
    input.totalContributions,
    input.retirementAge,
    other
  );

  const nisMonthly = floor.nis.type === "PENSION" ? (floor.nis.monthly ?? 0) : 0;
  const scpMonthly = floor.scp.monthly;

  // Declare exactly what produced THIS number — per branch, because the branches read
  // different tables. The averaging basis is not read by the calculation; it is declared
  // because the rule below tells the client the basis, and that claim needs its source.
  b.use("nis.averaging_basis");
  b.rule(
    "NIS is averaged over the WHOLE WORKING LIFE of insurable earnings — " +
    "not final salary, and not the last 7 years"
  );
  b.use("nis.qualifying_conditions"); // the contribution threshold choosing PENSION vs GRANT
  b.use("nis.minimum_pension");

  if (floor.nis.type === "GRANT") {
    b.use("nis.retirement_grant");
    b.rule("fewer than 750 contributions — Retirement Grant (lump sum), not a pension");
    b.rule("the grant is excluded from SCP assessed income");
  } else {
    // The earnings-to-class table, then the NIBTT basic-pension table the figure is read
    // from — this is the parameter the reported number literally comes from, and it must
    // carry NIBTT's effective date and source into the client's audit trail.
    b.use(`nis.contribution_tables.${NIS_CONTRIBUTION_TABLE}`);
    b.use("nis.benefit_rates.current");
    b.rule(`NIS pension: class ${floor.nis.class}`);
    if (floor.nis.minimumApplied) b.rule("the 3,000/month minimum pension binds");
    if (nisMonthly > 0 && scpMonthly > 0) {
      b.use("scp.assessed_income_includes_nis_pension");
      b.rule("NIS pension counts as SCP assessed income — SCP reduced accordingly");
    }
  }

  // SCP: eligibility is tested on every path; the bands and the cliff edges are only
  // consulted once the age test passes. Mirroring `scpBenefit`'s own age test against
  // the parameter (never a literal) keeps the declared list honest on both branches.
  const scpQualifyingAge = b.useNode("scp.eligibility").node.age as number;
  if (input.retirementAge >= scpQualifyingAge) {
    b.use("scp.bands");
    b.use("scp.cliff_edges");
  }

  // SCP payable at zero is not self-explanatory: retiring at 60 halves the guaranteed
  // floor versus 66, and NIS retirement age phases 60 -> 65, so this is a live case.
  // `scpBenefit` returns `reason` precisely to explain the zero — forward it.
  if (!floor.scp.eligible && floor.scp.reason) {
    b.rule(`SCP not payable: ${floor.scp.reason}`);
    b.caveat(
      `No Senior Citizens' Pension is included in this floor: ${floor.scp.reason} ` +
      "Retiring earlier therefore lowers the guaranteed floor by the whole SCP amount."
    );
  }

  if (floor.nis.caveat) b.caveat(floor.nis.caveat);
  if (floor.scp.cliffWarning) b.caveat(floor.scp.cliffWarning);

  const guaranteedFloorMonthly = nisMonthly + scpMonthly + other;
  const monthlyShortfall = Math.max(0, input.targetMonthlyIncome - guaranteedFloorMonthly);

  return {
    targetMonthlyIncome: input.targetMonthlyIncome,
    nisMonthly,
    scpMonthly,
    otherMonthlyIncome: other,
    guaranteedFloorMonthly,
    monthlyShortfall,
    provenance: b.build(),
  };
}
