import { test } from "node:test";
import assert from "node:assert/strict";
import {
  inForceCoverAt, totalMonthlyPremium, totalCashValue, universalLifePolicies,
  GROUP_LIFE_REDUCTION_AGE, GROUP_LIFE_TERMINATION_AGE,
} from "../src/policy-ledger.ts";
import type { Policy } from "../src/types.ts";

const individual: Policy = {
  id: "p1", insurer: "Tatil Life", productName: "Whole Life 2023", type: "whole-life",
  coverAmount: 250000, monthlyPremium: 467.18, cashValue: 31283,
  status: "in-force", isGroupCover: false,
};

const group: Policy = {
  id: "p2", insurer: "Employer Scheme", productName: "Group Life", type: "group-life",
  coverAmount: 200000, monthlyPremium: 0, status: "in-force", isGroupCover: true,
};

const lapsed: Policy = {
  id: "p3", insurer: "Guardian", productName: "Term", type: "term",
  coverAmount: 100000, monthlyPremium: 120, status: "lapsed", isGroupCover: false,
};

const cashbuilder: Policy = {
  id: "p4", insurer: "Tatil Life", productName: "Cashbuilder II", type: "universal-life",
  coverAmount: 150000, monthlyPremium: 300, cashValue: 45000,
  status: "in-force", isGroupCover: false,
};

const all = [individual, group, lapsed, cashbuilder];

test("lapsed policies contribute no cover", () => {
  const c = inForceCoverAt([lapsed], 40);
  assert.equal(c.total, 0);
});

test("below 66, group cover counts in full", () => {
  const c = inForceCoverAt(all, 40);
  assert.equal(c.individual, 400000, "whole life 250k + cashbuilder 150k");
  assert.equal(c.group, 200000);
  assert.equal(c.total, 600000);
});

test("group cover halves at 66", () => {
  const c = inForceCoverAt(all, GROUP_LIFE_REDUCTION_AGE);
  assert.equal(c.group, 100000);
  assert.equal(c.total, 500000);
});

test("group cover terminates at 70 — the protection gap", () => {
  const c = inForceCoverAt(all, GROUP_LIFE_TERMINATION_AGE);
  assert.equal(c.group, 0, "no post-retirement group cover");
  assert.equal(c.individual, 400000, "individual cover survives");
  assert.equal(c.total, 400000);
});

test("group cover is still zero above 70", () => {
  assert.equal(inForceCoverAt(all, 75).group, 0);
});

test("premiums and cash value sum only over in-force policies", () => {
  // Money is TTD as float and the engine must NOT round intermediates (Global Constraint),
  // so 467.18 + 300 lands on 767.1800000000001 in IEEE-754. The tolerance belongs in the
  // TEST, not in the implementation — rounding in the engine would violate the constraint.
  const premium = totalMonthlyPremium(all);
  assert.ok(Math.abs(premium - 767.18) < 0.005,
    `expected ~767.18 (467.18 + 0 + 300; lapsed excluded), got ${premium}`);

  // Cash values are whole dollars here, so exact equality is safe.
  assert.equal(totalCashValue(all), 76283, "31283 + 45000");
});

test("universalLifePolicies finds the X-ray's highest-value target", () => {
  const ul = universalLifePolicies(all);
  assert.equal(ul.length, 1);
  assert.equal(ul[0]!.productName, "Cashbuilder II");
});
