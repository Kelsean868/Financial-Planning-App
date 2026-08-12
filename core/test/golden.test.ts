import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeDeathNeeds, computeGap, computeRetirementNeeds } from "../src/index.ts";
import type { Household, Person, Policy, Provenance } from "../src/types.ts";

const golden = JSON.parse(
  readFileSync(new URL("./golden/kyron-household.json", import.meta.url), "utf8")
);

const client: Person = {
  id: "c1", name: "Client", sex: "male", dateOfBirth: "1990-06-15",
  relationship: "self", isFormalDependent: false,
};
const mother: Person = {
  id: "d1", name: "Mother", sex: "female", dateOfBirth: "1955-01-10",
  relationship: "parent", isFormalDependent: false, monthlySupport: 800,
};
const child: Person = {
  id: "d2", name: "Child", sex: "female", dateOfBirth: "2018-09-20",
  relationship: "child", isFormalDependent: true,
};

const household: Household = {
  client, dependents: [mother, child],
  monthlyIncome: 12000, monthlyExpenses: 9000,
  debts: [
    { kind: "mortgage", balance: 350000, monthlyInstallment: 3000, endDate: "2040-01-21" },
    { kind: "credit-union", balance: 1500, monthlyInstallment: 250, endDate: "2027-11-04" },
  ],
  savings: 20000, otherInvestments: 5000, housingStrategy: "liquidate-mortgage",
  educationCost: 150000, expectedFuneralCost: 40000, expectedMedicalCost: 10000,
};

const policies: Policy[] = [
  { id: "p1", insurer: "Tatil Life", productName: "Whole Life 2023", type: "whole-life",
    coverAmount: 250000, monthlyPremium: 467.18, cashValue: 31283, status: "in-force", isGroupCover: false },
  { id: "p2", insurer: "Employer", productName: "Group Life", type: "group-life",
    coverAmount: 200000, monthlyPremium: 0, status: "in-force", isGroupCover: true },
];

test("golden: death needs match the frozen hand-computed case", () => {
  const n = computeDeathNeeds(household, golden.on);
  const e = golden.expected.deathNeeds;
  assert.equal(n.funeral, e.funeral);
  assert.equal(n.medical, e.medical);
  assert.equal(n.outstandingLoans, e.outstandingLoans);
  assert.equal(n.mortgageLiquidation, e.mortgageLiquidation);
  assert.equal(n.housingRentReplacement, e.housingRentReplacement);
  assert.equal(n.education, e.education);
  assert.equal(n.assets.total, e.assetsTotal);
  // incomeContinuation carries fractional years (13.18 years to the child's 21st),
  // so it — and everything downstream of it — is a float. Money is never rounded
  // in the engine, so the tolerance lives here in the test, not in the source.
  assert.ok(
    Math.abs(n.incomeContinuation - e.incomeContinuation) < 0.01,
    `incomeContinuation ${n.incomeContinuation} !== ${e.incomeContinuation}`
  );
  assert.ok(
    Math.abs(n.totalNeeds - e.totalNeeds) < 0.01,
    `totalNeeds ${n.totalNeeds} !== ${e.totalNeeds}`
  );
  assert.ok(
    Math.abs(n.insuranceNeed - e.insuranceNeed) < 0.01,
    `insuranceNeed ${n.insuranceNeed} !== ${e.insuranceNeed}`
  );
});

test("golden: the gap at 40 and at 70 — group cover vanishes", () => {
  const n = computeDeathNeeds(household, golden.on);
  const g40 = computeGap(n, policies, 40);
  const g70 = computeGap(n, policies, 70);
  assert.equal(g40.inForceCover, golden.expected.gapAt40.inForceCover);
  assert.equal(g40.groupCoverExcluded, golden.expected.gapAt40.groupCoverExcluded);
  assert.equal(g70.inForceCover, golden.expected.gapAt70.inForceCover);
  assert.equal(g70.groupCoverExcluded, golden.expected.gapAt70.groupCoverExcluded);
  // The gap magnitude, not just the ordering — this is the number the client sees.
  assert.ok(
    Math.abs(g40.gap - golden.expected.gapAt40.gap) < 0.01,
    `gap at 40: ${g40.gap} !== ${golden.expected.gapAt40.gap}`
  );
  assert.ok(
    Math.abs(g70.gap - golden.expected.gapAt70.gap) < 0.01,
    `gap at 70: ${g70.gap} !== ${golden.expected.gapAt70.gap}`
  );
  assert.ok(g70.gap > g40.gap, "losing group cover widens the gap");
});

test("golden: the retirement floor and the SCP offset", () => {
  const r = computeRetirementNeeds({
    lifetimeAvgMonthlyEarnings: 1000, totalContributions: 750,
    retirementAge: 66, targetMonthlyIncome: 9000,
  });
  const e = golden.expected.retirementAt66;
  assert.equal(r.nisMonthly, e.nisMonthly);
  assert.equal(r.scpMonthly, e.scpMonthly);
  assert.equal(r.guaranteedFloorMonthly, e.guaranteedFloorMonthly);
});

/**
 * Assert the audit trail names the parameters that actually made the number, and that
 * each one arrives with a source and a status.
 *
 * The previous form of this test — `every(p => p.effective !== undefined && p.status)` —
 * could not fail: `provenance.ts` sets `effective` via `?? null`, so it is never
 * `undefined`, and the loop is vacuous over an empty list besides. It passed a build in
 * which the group-life parameters, the rule that most moves the gap, entered no
 * provenance at all. A gate that cannot fail is not a gate.
 */
/**
 * Parameters whose citation legitimately is not a `source` URL, and which therefore
 * enter provenance with `source: null`:
 *  - `scp.eligibility` cites `basis`: "s.4(1) Senior Citizens' Pension Act Chap. 32:02".
 *    A statute section IS the provenance — there is no better URL for it.
 *  - `scp.cliff_edges` is `DERIVED` from `scp.bands`; its provenance is its derivation.
 *  - `nis.retirement_grant` carries its explanation in `notes`.
 *
 * This allowlist is deliberately explicit rather than a blanket "source may be null":
 * a NEW parameter arriving with no citation must fail this test and be argued for here.
 *
 * It also records a real gap found while writing this test: `ProvenanceBuilder` records
 * only `source`, so a statutory `basis` is DROPPED on the way into the audit trail. The
 * table cites the Act; the client's provenance shows null. Fixing that changes the
 * `Provenance` shape and every consumer of it — see the task report.
 */
const CITED_ELSEWHERE = new Set(["scp.eligibility", "scp.cliff_edges", "nis.retirement_grant"]);

function assertProvenanceNames(p: Provenance, expectedPaths: string[], label: string): void {
  assert.ok(p.parameters.length > 0, `${label}: parameters used must be recorded`);
  const paths = p.parameters.map((x) => x.path);
  for (const expected of expectedPaths) {
    assert.ok(paths.includes(expected),
      `${label}: ${expected} produced the number but is absent from provenance. Present: ${paths.join(", ")}`);
  }
  for (const param of p.parameters) {
    if (!CITED_ELSEWHERE.has(param.path)) {
      assert.ok(typeof param.source === "string" && param.source.length > 0,
        `${label}: ${param.path} carries no source — a regulator cannot check it`);
    }
    assert.ok(typeof param.status === "string" && param.status.length > 0,
      `${label}: ${param.path} carries no status`);
  }
}

test("golden: every result carries provenance a regulator could read", () => {
  // This household is an owner who liquidates, so `rental_income_months` is deliberately
  // NOT expected: it never multiplies into the number and must not be claimed as used.
  const n = computeDeathNeeds(household, golden.on);
  assertProvenanceNames(n.provenance, [
    "conventions.income_continuation_to_age",
    "conventions.funeral_cost_default",
    "conventions.medical_cost_minimum",
  ], "deathNeeds");
  assert.ok(n.provenance.rulesFired.length > 0, "rules fired must be recorded");

  // The gap applies the group-life decay, so the parameters that drive it must be in
  // the trail — with the caveat that they come from one carrier's terms.
  const g = computeGap(n, policies, 40);
  assertProvenanceNames(g.provenance, [
    "conventions.income_continuation_to_age",
    "group_life.reduction_age",
    "group_life.reduction_factor",
    "group_life.termination_age",
  ], "gap");
  assert.ok(g.provenance.caveats.some((c) => /carriers.*may differ/i.test(c)),
    "the client must be told the group terms come from a single carrier");

  // The NIBTT basic-pension table is where the reported figure literally comes from.
  const r = computeRetirementNeeds({
    lifetimeAvgMonthlyEarnings: 1000, totalContributions: 750,
    retirementAge: 66, targetMonthlyIncome: 9000,
  });
  assertProvenanceNames(r.provenance, [
    "nis.benefit_rates.current",
    "nis.contribution_tables.2016-09-05",
    "nis.qualifying_conditions",
    "nis.minimum_pension",
    "scp.bands",
    "scp.eligibility",
  ], "retirement");
});
