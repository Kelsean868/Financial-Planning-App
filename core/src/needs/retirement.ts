import { retirementFloor } from "../../../parameters/tt-parameters.js";
import type { RetirementNeedsProfile, TTD } from "../types.ts";
import { ProvenanceBuilder } from "../provenance.ts";

/**
 * Retirement shortfall against the NIS + SCP guaranteed floor.
 *
 * NIS and SCP MUST be modelled together: NIS retirement pension counts as SCP
 * assessed income (SCP form items 6 & 31), so it claws back a band of SCP.
 * `lifetimeAvgMonthlyEarnings` is the WHOLE-WORKING-LIFE average, not final salary
 * and not the last 7 years — confirmed verbatim from NIBTT training material.
 */
export function computeRetirementNeeds(input: {
  lifetimeAvgMonthlyEarnings: TTD;
  totalContributions: number;
  retirementAge: number;
  targetMonthlyIncome: TTD;
  otherMonthlyIncome?: TTD;
}): RetirementNeedsProfile {
  const b = new ProvenanceBuilder();
  b.use("nis.averaging_basis");
  b.use("nis.minimum_pension");
  b.use("scp.bands");
  b.use("scp.assessed_income_includes_nis_pension");

  const other = input.otherMonthlyIncome ?? 0;
  const floor = retirementFloor(
    input.lifetimeAvgMonthlyEarnings,
    input.totalContributions,
    input.retirementAge,
    other
  );

  const nisMonthly = floor.nis.type === "PENSION" ? (floor.nis.monthly ?? 0) : 0;
  const scpMonthly = floor.scp.monthly;

  if (floor.nis.type === "GRANT") {
    b.rule("fewer than 750 contributions — Retirement Grant (lump sum), not a pension");
    b.rule("the grant is excluded from SCP assessed income");
  } else {
    b.rule(`NIS pension: class ${floor.nis.class}`);
    if (floor.nis.minimumApplied) b.rule("the 3,000/month minimum pension binds");
    if (nisMonthly > 0 && scpMonthly > 0) {
      b.rule("NIS pension counts as SCP assessed income — SCP reduced accordingly");
    }
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
