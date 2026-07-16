import { test } from "node:test";
import assert from "node:assert/strict";
import { computeDeathNeeds } from "../src/needs/death.ts";
import type { Household, Person } from "../src/types.ts";

const client: Person = {
  id: "c1", name: "Client", sex: "male", dateOfBirth: "1990-06-15",
  relationship: "self", isFormalDependent: false,
};
const child: Person = {
  id: "d1", name: "Child", sex: "female", dateOfBirth: "2018-09-20",
  relationship: "child", isFormalDependent: true,
};

const owner: Household = {
  client, dependents: [child],
  monthlyIncome: 12000, monthlyExpenses: 9000,
  debts: [
    { kind: "mortgage", balance: 350000, monthlyInstallment: 3000, endDate: "2040-01-21" },
    { kind: "credit-union", balance: 1500, monthlyInstallment: 250, endDate: "2027-11-04" },
  ],
  savings: 20000, otherInvestments: 5000,
  educationCost: 150000, expectedFuneralCost: 40000, expectedMedicalCost: 10000,
};

const TODAY = "2026-07-16";

test("owner: mortgage is liquidated and rent replacement is zero — housing is not double-counted", () => {
  const n = computeDeathNeeds(owner, TODAY);
  assert.equal(n.mortgageLiquidation, 350000);
  assert.equal(n.housingRentReplacement, 0);
});

test("renter: 120 months of rent replaces mortgage liquidation", () => {
  const renter: Household = { ...owner, debts: [owner.debts[1]!], monthlyRent: 4000 };
  const n = computeDeathNeeds(renter, TODAY);
  assert.equal(n.mortgageLiquidation, 0);
  assert.equal(n.housingRentReplacement, 480000, "4000 x 120 months");
});

test("income continuation runs until the last child reaches 21", () => {
  const n = computeDeathNeeds(owner, TODAY);
  // child born 2018-09-20 reaches 21 on 2039-09-20 = 13.18y from TODAY.
  // 9000 monthly expenses x 12 x 13.18 = ~1,423,471
  assert.ok(n.incomeContinuation > 1_420_000 && n.incomeContinuation < 1_430_000,
    `expected ~1.42M, got ${n.incomeContinuation}`);
});

test("no children => no income continuation", () => {
  const n = computeDeathNeeds({ ...owner, dependents: [] }, TODAY);
  assert.equal(n.incomeContinuation, 0);
});

test("total need nets assets and never goes below zero", () => {
  const n = computeDeathNeeds(owner, TODAY);
  assert.equal(n.assets.total, 25000, "savings 20000 + investments 5000");
  assert.equal(n.insuranceNeed, Math.max(0, n.totalNeeds - n.assets.total));

  const rich = computeDeathNeeds({ ...owner, savings: 99_000_000 }, TODAY);
  assert.equal(rich.insuranceNeed, 0, "over-assetted households need zero, not negative");
});

test("NIS survivor benefit reduces the income-continuation need", () => {
  const without = computeDeathNeeds(owner, TODAY);
  const with_ = computeDeathNeeds(owner, TODAY, { nisSurvivorMonthly: 1000 });
  assert.ok(with_.incomeContinuation < without.incomeContinuation);
  assert.ok(with_.provenance.rulesFired.some((r) => r.includes("NIS survivor")));
});

test("provenance records the T&T conventions used and contains no estate-tax driver", () => {
  const n = computeDeathNeeds(owner, TODAY);
  const paths = n.provenance.parameters.map((p) => p.path);
  assert.ok(paths.includes("conventions.income_continuation_to_age"));
  assert.ok(paths.includes("conventions.rental_income_months"));
  assert.ok(!JSON.stringify(n).toLowerCase().includes("estate_tax"),
    "T&T has no estate tax — the US liquidity driver must not appear");
});

test("the housing-alternatives reading is flagged as an inference, not a verified rule", () => {
  const n = computeDeathNeeds(owner, TODAY);
  assert.ok(n.provenance.caveats.some((c) => c.includes("housing")),
    "must surface that mortgage-vs-rent is an inference pending confirmation");
});

test("deterministic — identical inputs give byte-identical output", () => {
  assert.equal(
    JSON.stringify(computeDeathNeeds(owner, TODAY)),
    JSON.stringify(computeDeathNeeds(owner, TODAY))
  );
});
