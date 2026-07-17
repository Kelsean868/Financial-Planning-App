import { test } from "node:test";
import assert from "node:assert/strict";
import { computeRetirementNeeds } from "../src/needs/retirement.ts";

test("no NIS entitlement: SCP alone pays 3,500", () => {
  const r = computeRetirementNeeds({
    lifetimeAvgMonthlyEarnings: 0, totalContributions: 0,
    retirementAge: 66, targetMonthlyIncome: 8000,
  });
  assert.equal(r.nisMonthly, 0);
  assert.equal(r.scpMonthly, 3500);
  assert.equal(r.guaranteedFloorMonthly, 3500);
  assert.equal(r.monthlyShortfall, 4500);
});

test("the SCP offset: a 3,000 NIS pension delivers only 2,000 net", () => {
  const none = computeRetirementNeeds({
    lifetimeAvgMonthlyEarnings: 0, totalContributions: 0,
    retirementAge: 66, targetMonthlyIncome: 8000,
  });
  const min = computeRetirementNeeds({
    lifetimeAvgMonthlyEarnings: 1000, totalContributions: 750,
    retirementAge: 66, targetMonthlyIncome: 8000,
  });
  assert.equal(min.nisMonthly, 3000, "Class I at 750 contributions => the 3,000 minimum binds");
  assert.equal(min.scpMonthly, 2500, "NIS counts as assessed income => SCP drops a band");
  assert.equal(min.guaranteedFloorMonthly - none.guaranteedFloorMonthly, 2000);
  assert.ok(min.provenance.rulesFired.some((r) => r.includes("SCP")));
});

test("shortfall never goes negative", () => {
  const r = computeRetirementNeeds({
    lifetimeAvgMonthlyEarnings: 1000, totalContributions: 750,
    retirementAge: 66, targetMonthlyIncome: 2000,
  });
  assert.equal(r.monthlyShortfall, 0);
});

test("increments are not silently applied — the caveat surfaces instead", () => {
  const r = computeRetirementNeeds({
    lifetimeAvgMonthlyEarnings: 6000, totalContributions: 1050,
    retirementAge: 66, targetMonthlyIncome: 10000,
  });
  assert.ok(r.provenance.caveats.some((c) => c.toLowerCase().includes("increment")),
    "NIBTT has published no 2016 increment schedule — we must say so, not guess");
});

test("below SCP age, only NIS counts", () => {
  const r = computeRetirementNeeds({
    lifetimeAvgMonthlyEarnings: 1000, totalContributions: 750,
    retirementAge: 62, targetMonthlyIncome: 8000,
  });
  assert.equal(r.scpMonthly, 0, "SCP requires age 65");
  assert.equal(r.guaranteedFloorMonthly, 3000);
});

/**
 * Retiring at 60 halves the guaranteed floor versus 66 (3,000 vs 5,500) purely because
 * SCP is not yet payable. NIS retirement age phases 60 -> 65, so 60-64 is a live case,
 * not an edge. The engine used to report the zero with nothing in the trail explaining
 * it: `scpBenefit` returns `reason` precisely to explain it, and only `.cliffWarning`
 * was being read — which is `undefined` on the ineligible branch.
 */
test("retiring before SCP age: the client is told WHY their SCP is zero", () => {
  const early = computeRetirementNeeds({
    lifetimeAvgMonthlyEarnings: 1000, totalContributions: 750,
    retirementAge: 60, targetMonthlyIncome: 8000,
  });
  const later = computeRetirementNeeds({
    lifetimeAvgMonthlyEarnings: 1000, totalContributions: 750,
    retirementAge: 66, targetMonthlyIncome: 8000,
  });

  assert.equal(early.scpMonthly, 0);
  assert.equal(early.guaranteedFloorMonthly, 3000);
  assert.equal(later.guaranteedFloorMonthly, 5500, "precondition: the floor nearly doubles at 66");

  const explained = [...early.provenance.rulesFired, ...early.provenance.caveats];
  assert.ok(explained.some((s) => /SCP/.test(s) && /age/i.test(s)),
    `a 2x swing in the headline floor must be explained, got: ${JSON.stringify(explained)}`);
  assert.ok(!later.provenance.rulesFired.some((r) => /not payable/i.test(r)),
    "a client who does qualify must not be told SCP is unpayable");
});

test("deterministic", () => {
  const mk = () => JSON.stringify(computeRetirementNeeds({
    lifetimeAvgMonthlyEarnings: 5000, totalContributions: 900,
    retirementAge: 66, targetMonthlyIncome: 9000,
  }));
  assert.equal(mk(), mk());
});

test("SCP cliff proximity is flagged — the engine must not step a client over silently", () => {
  // Assessed income lands within $100 below the 5,500 cliff. Crossing it drops
  // SCP from 500 to zero: one extra dollar costs $500/month.
  const r = computeRetirementNeeds({
    lifetimeAvgMonthlyEarnings: 0, totalContributions: 0,
    retirementAge: 66, targetMonthlyIncome: 8000,
    otherMonthlyIncome: 5450,
  });
  const warned = r.provenance.caveats.some((c) => /cliff|threshold/i.test(c));
  assert.ok(warned,
    `expected a cliff-proximity caveat at 5,450 assessed income, got: ${JSON.stringify(r.provenance.caveats)}`);
});

test("crossing the 5,500 cliff zeroes SCP entirely", () => {
  const below = computeRetirementNeeds({
    lifetimeAvgMonthlyEarnings: 0, totalContributions: 0,
    retirementAge: 66, targetMonthlyIncome: 8000,
    otherMonthlyIncome: 5500,
  });
  const above = computeRetirementNeeds({
    lifetimeAvgMonthlyEarnings: 0, totalContributions: 0,
    retirementAge: 66, targetMonthlyIncome: 8000,
    otherMonthlyIncome: 5501,
  });
  assert.equal(below.scpMonthly, 500, "at exactly 5,500 SCP still pays 500");
  assert.equal(above.scpMonthly, 0, "at 5,501 SCP is a hard disqualification, not a taper");
});
