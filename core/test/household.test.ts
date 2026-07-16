import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ageAt, yearsToPayoff, totalDebtBalance, mortgageBalance, nonMortgageDebtBalance,
  youngestDependentChild, yearsUntilLastChildReaches, obligationDeclineSchedule,
  dependents,
} from "../src/household.ts";
import type { Household, Person, Debt } from "../src/types.ts";

const client: Person = {
  id: "c1", name: "Kyron", sex: "male", dateOfBirth: "1990-06-15",
  relationship: "self", isFormalDependent: false,
};

const mother: Person = {
  id: "d1", name: "Mother", sex: "female", dateOfBirth: "1955-01-10",
  relationship: "parent", isFormalDependent: false, monthlySupport: 800,
};

const child1: Person = {
  id: "d2", name: "Jaden", sex: "male", dateOfBirth: "2012-03-01",
  relationship: "child", isFormalDependent: true,
};

const child2: Person = {
  id: "d3", name: "Aaliyah", sex: "female", dateOfBirth: "2018-09-20",
  relationship: "child", isFormalDependent: true,
};

const debts: Debt[] = [
  { kind: "mortgage", balance: 350000, monthlyInstallment: 3000, endDate: "2040-01-21" },
  { kind: "credit-union", balance: 1500, monthlyInstallment: 250, endDate: "2027-11-04" },
];

const h: Household = {
  client, dependents: [mother, child1, child2],
  monthlyIncome: 12000, monthlyExpenses: 9000,
  debts, savings: 20000, otherInvestments: 5000,
};

const TODAY = "2026-07-16";

test("ageAt computes age on a given date, not from a clock", () => {
  assert.equal(ageAt("1990-06-15", "2026-07-16"), 36);
  assert.equal(ageAt("1990-08-15", "2026-07-16"), 35, "birthday not yet reached this year");
  assert.equal(ageAt("1990-07-16", "2026-07-16"), 36, "birthday exactly today");
});

test("yearsToPayoff derives the debt decline schedule input", () => {
  assert.ok(Math.abs(yearsToPayoff(debts[1]!, TODAY) - 1.30) < 0.02);
  assert.equal(yearsToPayoff({ ...debts[1]!, endDate: "2020-01-01" }, TODAY), 0, "past debts are zero, never negative");
});

test("debt totals split mortgage from the rest", () => {
  assert.equal(totalDebtBalance(h), 351500);
  assert.equal(mortgageBalance(h), 350000);
  assert.equal(nonMortgageDebtBalance(h), 1500);
});

test("informal dependents are counted — the household is not assumed nuclear", () => {
  const all = dependents(h);
  assert.equal(all.length, 3, "mother, and two children");

  const informal = all.filter((p) => !p.isFormalDependent);
  assert.equal(informal.length, 1);
  assert.equal(informal[0]!.name, "Mother");
  assert.equal(informal[0]!.relationship, "parent");
  assert.equal(informal[0]!.monthlySupport, 800,
    "an informally supported parent still carries a real monthly obligation");

  const nonChildren = all.filter((p) => p.relationship !== "child");
  assert.equal(nonChildren.length, 1,
    "the household must model dependents who are not spouse-or-child");
});

test("youngestDependentChild ignores non-children", () => {
  const y = youngestDependentChild(h, TODAY);
  assert.equal(y?.name, "Aaliyah");
});

test("yearsUntilLastChildReaches drives income continuation", () => {
  // Aaliyah born 2018-09-20 is 7 on 2026-07-16; she reaches 21 on 2039-09-20,
  // which is 13.18 years away (13 years + 66 days).
  const y = yearsUntilLastChildReaches(h, 21, TODAY);
  assert.ok(y > 13.1 && y < 13.3, `expected ~13.18, got ${y}`);
  assert.equal(yearsUntilLastChildReaches({ ...h, dependents: [mother] }, 21, TODAY), 0, "no children => zero");
});

test("obligationDeclineSchedule steps down as debts retire", () => {
  const s = obligationDeclineSchedule(h, TODAY);
  assert.equal(s[0]!.remainingDebt, 351500, "year 0 carries every debt");
  const y2 = s.find((x) => x.year === 2)!;
  assert.equal(y2.remainingDebt, 350000, "credit union retires in ~1.3y, leaving the mortgage");
  assert.equal(s.at(-1)!.remainingDebt, 0, "everything eventually retires");
});
