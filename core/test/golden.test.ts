import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeDeathNeeds, computeGap, computeRetirementNeeds } from "../src/index.ts";
import type { Household, Person, Policy } from "../src/types.ts";

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
  savings: 20000, otherInvestments: 5000,
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

test("golden: every result carries provenance a regulator could read", () => {
  const n = computeDeathNeeds(household, golden.on);
  assert.ok(n.provenance.parameters.length > 0, "parameters used must be recorded");
  assert.ok(n.provenance.parameters.every((p) => p.effective !== undefined && p.status));
  assert.ok(n.provenance.rulesFired.length > 0, "rules fired must be recorded");
});
