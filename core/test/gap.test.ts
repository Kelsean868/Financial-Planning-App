import { test } from "node:test";
import assert from "node:assert/strict";
import { computeGap } from "../src/gap.ts";
import { computeDeathNeeds } from "../src/needs/death.ts";
import { GROUP_LIFE_REDUCTION_AGE } from "../src/policy-ledger.ts";
import type { DeathNeedsProfile, Household, Person, Policy } from "../src/types.ts";

const needs = {
  funeral: 40000, medical: 10000, outstandingLoans: 1500, mortgageLiquidation: 350000,
  housingRentReplacement: 0, education: 150000, incomeContinuation: 1_000_000,
  totalNeeds: 1_551_500,
  assets: { savings: 20000, lifeInsurance: 0, otherInvestments: 5000, total: 25000 },
  insuranceNeed: 1_526_500,
  provenance: { parameters: [], caveats: [], rulesFired: [] },
} satisfies DeathNeedsProfile;

const individual: Policy = {
  id: "p1", insurer: "Tatil Life", productName: "Whole Life", type: "whole-life",
  coverAmount: 250000, monthlyPremium: 467, status: "in-force", isGroupCover: false,
};
const group: Policy = {
  id: "p2", insurer: "Employer", productName: "Group Life", type: "group-life",
  coverAmount: 200000, monthlyPremium: 0, status: "in-force", isGroupCover: true,
};

// Fixtures for the tests that exercise the real needs engine (mirrors needs-death.test.ts).
const client: Person = {
  id: "c1", name: "Client", sex: "male", dateOfBirth: "1990-06-15",
  relationship: "self", isFormalDependent: false,
};
const childDependent: Person = {
  id: "d1", name: "Child", sex: "female", dateOfBirth: "2018-09-20",
  relationship: "child", isFormalDependent: true,
};
const household: Household = {
  client, dependents: [childDependent],
  monthlyIncome: 12000, monthlyExpenses: 9000,
  debts: [
    { kind: "mortgage", balance: 350000, monthlyInstallment: 3000, endDate: "2040-01-21" },
    { kind: "credit-union", balance: 1500, monthlyInstallment: 250, endDate: "2027-11-04" },
  ],
  savings: 20000, otherInvestments: 5000,
  educationCost: 150000, expectedFuneralCost: 40000, expectedMedicalCost: 10000,
};
const TODAY = "2026-07-16";

test("gap is need minus in-force cover", () => {
  const g = computeGap(needs, [individual, group], 40);
  assert.equal(g.need, 1_526_500);
  assert.equal(g.inForceCover, 450000, "250k individual + 200k group at age 40");
  assert.equal(g.gap, 1_076_500);
});

test("at 70 the group cover is gone and the gap widens — and we say so", () => {
  const g = computeGap(needs, [individual, group], 70);
  assert.equal(g.inForceCover, 250000);
  assert.equal(g.groupCoverExcluded, 200000);
  assert.equal(g.gap, 1_276_500);
  assert.ok(g.provenance.rulesFired.some((r) => r.includes("group")),
    "the client must be told their work cover ends at 70");
});

test("over-insured households have a zero gap, never negative", () => {
  const huge: Policy = { ...individual, coverAmount: 99_000_000 };
  assert.equal(computeGap(needs, [huge], 40).gap, 0);
});

test("deterministic", () => {
  const mk = () => JSON.stringify(computeGap(needs, [individual, group], 40));
  assert.equal(mk(), mk());
});

test("the Gap carries the needs engine's caveats forward — a client never sees a number without its uncertainty", () => {
  const realNeeds = computeDeathNeeds(household, TODAY);
  const g = computeGap(realNeeds, [individual, group], 35);
  assert.ok(realNeeds.provenance.caveats.length > 0, "precondition: the death engine emits caveats");
  for (const c of realNeeds.provenance.caveats) {
    assert.ok(g.provenance.caveats.includes(c), `Gap dropped the caveat: ${c}`);
  }
  assert.ok(g.provenance.caveats.some((c) => /inference|alternativ|Tatil form/i.test(c)),
    "the housing-alternatives inference caveat must reach the Gap");
  for (const p of realNeeds.provenance.parameters) {
    assert.ok(g.provenance.parameters.some((q) => q.path === p.path),
      `Gap dropped the parameter: ${p.path}`);
  }
});

/**
 * Group CI riders are common on T&T group schemes. Critical illness is not death cover,
 * so the rider's face must never enter the group death-cover reasoning at all.
 *
 * The bug this pins: the gap re-derived the eligible-policy filter and omitted the
 * policy-type exclusion, so the rider's 100k read as group cover that had been reduced.
 * The client was told "group cover reduced by 100000 at attained age 50" — nothing is
 * reduced at 50 — and, because the phantom exclusion routed into the reduction branch,
 * was NOT told that the group cover they do have halves at 66 and ends at 70. A false
 * statement in the audit trail, and the mis-selling warning silently suppressed.
 */
test("a group critical-illness rider creates no phantom reduction below the reduction age", () => {
  const groupCI: Policy = {
    id: "p3", insurer: "Employer", productName: "Group Critical Illness",
    type: "critical-illness", coverAmount: 100000, monthlyPremium: 0,
    status: "in-force", isGroupCover: true,
  };
  const belowReduction = GROUP_LIFE_REDUCTION_AGE - 16; // 50 — well below any decay
  const g = computeGap(needs, [group, groupCI], belowReduction);

  assert.equal(g.inForceCover, 200000, "only the group LIFE face is death cover");
  assert.equal(g.groupCoverExcluded, 0, "nothing is excluded at 50 — the CI rider is not group death cover");
  assert.ok(!g.provenance.rulesFired.some((r) => /reduced|terminated/i.test(r)),
    `no reduction happens at ${belowReduction} — the audit trail must not claim one: ${g.provenance.rulesFired.join(" | ")}`);
  assert.ok(g.provenance.rulesFired.some((r) => /counted in full/i.test(r)),
    "the client must still be told their group cover halves at 66 and ends at 70");
});

test("the group-life parameters reach provenance, with their carrier caveat", () => {
  const g = computeGap(needs, [individual, group], 40);
  const paths = g.provenance.parameters.map((p) => p.path);
  for (const path of ["group_life.reduction_age", "group_life.reduction_factor", "group_life.termination_age"]) {
    assert.ok(paths.includes(path), `${path} moved the number but carries no source: ${paths.join(", ")}`);
  }
  assert.ok(g.provenance.parameters.every((p) => p.source && p.status),
    "every recorded parameter must carry a source and a status");
  assert.ok(g.provenance.caveats.some((c) => /carriers.*may differ/i.test(c)),
    "the client must be told other T&T carriers' group schemes may differ");
});

test("a client with no group cover gets no group-life parameters in their trail", () => {
  const g = computeGap(needs, [individual], 40);
  assert.ok(!g.provenance.parameters.some((p) => p.path.startsWith("group_life.")),
    "provenance must not be padded with rules that did not apply to this client");
  assert.ok(!g.provenance.caveats.some((c) => /carriers.*may differ/i.test(c)),
    "no group cover, no group caveat");
});

test("an annuity is not death cover either", () => {
  const annuity: Policy = {
    id: "p4", insurer: "Tatil Life", productName: "Deferred Annuity", type: "annuity",
    coverAmount: 500000, monthlyPremium: 900, status: "in-force", isGroupCover: false,
  };
  const g = computeGap(needs, [individual, annuity], 40);
  assert.equal(g.inForceCover, 250000, "the annuity's value must not offset a death need");
});

test("group cover is half-counted between the reduction and termination ages", () => {
  const realNeeds = computeDeathNeeds(household, TODAY);
  const g = computeGap(realNeeds, [individual, group], GROUP_LIFE_REDUCTION_AGE);
  const full = computeGap(realNeeds, [individual, group], GROUP_LIFE_REDUCTION_AGE - 1);
  assert.ok(g.gap > full.gap, "the gap must widen once group cover halves");
  assert.ok(g.provenance.rulesFired.some((r) => /reduced/i.test(r)),
    "the reduction must be recorded as a rule, not applied silently");
});
