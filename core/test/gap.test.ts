import { test } from "node:test";
import assert from "node:assert/strict";
import { computeGap } from "../src/gap.ts";
import type { DeathNeedsProfile, Policy } from "../src/types.ts";

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
